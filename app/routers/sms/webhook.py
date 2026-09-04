import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.sms import SMSMessage, SMSSession
from app.services.farmer import farmer_service
from app.services.mandi import mandi_service
from app.services.sms_gate import sms_gate_client
from app.utils.phone import normalize_phone

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sms"])

COMMANDS = {
    "HELP",
    "REGISTER",
    "BOOK",
    "STATUS",
    "QUEUE",
    "CENTRE",
    "PAYMENT",
    "HISTORY",
    "CANCEL",
    "RESCHEDULE",
}


class SMSWebhookPayload(BaseModel):
    """SMS Gate webhook payload for incoming messages.

    SMS Gate cloud enclose-format sends an envelope:
      { "event": "sms:received", "payload": { "message", "sender", ... } }
    Older/flat format sends the fields at the top level:
      { "message": ..., "sender": ..., "recipient": ... }
    Both are normalized here.
    """

    event: str | None = None
    messageId: str | None = None
    message: str = ""
    sender: str = ""
    recipient: str | None = None

    @classmethod
    def from_envelope(cls, body: dict) -> "SMSWebhookPayload":
        payload = body.get("payload") if isinstance(body.get("payload"), dict) else None
        fields = {
            "event": body.get("event"),
            "messageId": (payload or {}).get("messageId") or body.get("messageId"),
            "message": (payload or {}).get("message") or body.get("message", ""),
            "sender": (payload or {}).get("sender") or body.get("sender", ""),
            "recipient": (payload or {}).get("recipient") or body.get("recipient"),
        }
        return cls(**fields)


async def _send_reply(phone: str, message: str) -> None:
    """Send an outgoing SMS and log it."""
    async with async_session_factory() as db:
        msg = SMSMessage(phone=phone, direction="outgoing", content=message, status="sent")
        db.add(msg)
        await db.commit()
    await sms_gate_client.send_sms(phone, message)


async def _get_or_create_session(
    db: AsyncSession, phone: str, message_id: str | None
) -> SMSSession | None:
    """Get active session or create idle one. Returns None if duplicate message."""
    # Check for duplicate webhook (idempotency)
    if message_id:
        existing = await db.execute(
            select(SMSSession).where(SMSSession.message_idempotency_key == message_id)
        )
        if existing.scalar_one_or_none():
            logger.info("Duplicate SMS message_id=%s, skipping", message_id)
            return None

    # Find active session
    result = await db.execute(
        select(SMSSession)
        .where(
            SMSSession.phone == phone,
            SMSSession.expires_at > datetime.now(timezone.utc),
        )
        .order_by(SMSSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()

    if not session:
        session = SMSSession(
            phone=phone,
            state="idle",
            context={},
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(session)
        await db.flush()

    # Mark message as processed
    if message_id:
        session.message_idempotency_key = message_id

    return session


async def _handle_registration_flow(session: SMSSession, text: str, phone: str) -> str | None:
    """Handle multi-step SMS registration. Returns reply message."""
    ctx = session.context or {}
    state = session.state

    if state == "awaiting_name":
        session.context = {**ctx, "name": text.strip()}
        session.state = "awaiting_pincode"
        return "Enter your 6-digit pincode."

    if state == "awaiting_pincode":
        pincode = text.strip()
        if not pincode.isdigit() or len(pincode) != 6:
            return "Please enter a valid 6-digit pincode."
        session.context = {**ctx, "pincode": pincode}
        session.state = "awaiting_village"
        return "Enter your village name."

    if state == "awaiting_village":
        session.context = {**ctx, "village": text.strip()}
        session.state = "awaiting_district"
        return "Enter your district."

    if state == "awaiting_district":
        session.context = {**ctx, "district": text.strip()}
        session.state = "confirm_registration"
        updated = session.context
        name = updated.get("name", "")
        village = updated.get("village", "")
        district = updated.get("district", "")
        pincode = updated.get("pincode", "")
        return (
            f"Please confirm your details:\n"
            f"Name: {name}\n"
            f"Village: {village}\n"
            f"District: {district}\n"
            f"Pincode: {pincode}\n"
            f"Reply YES to confirm or NO to cancel."
        )

    if state == "confirm_registration":
        if text.strip().upper() == "YES":
            from app.schemas.farmer import FarmerRegisterRequest

            data = FarmerRegisterRequest(
                name=ctx["name"],
                village=ctx.get("village"),
                district=ctx.get("district"),
                pincode=ctx.get("pincode"),
            )
            async with async_session_factory() as db:
                farmer = await farmer_service.register(db, phone, data)
                await db.commit()
            session.state = "idle"
            session.context = {}
            session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            return f"Registration complete! Your Farmer ID is {farmer.farmer_id}."
        else:
            session.state = "idle"
            session.context = {}
            return "Registration cancelled. Send REGISTER to start again."

    return None


async def _handle_command(phone: str, text: str, session: SMSSession) -> str | None:
    """Process a command or continue an active conversation. Returns None when
    the message should be ignored (e.g. a spam/service notice)."""
    stripped = text.strip()
    command = stripped.split(maxsplit=1)[0].upper() if stripped else ""

    # If in a conversation flow, continue it
    if session.state and session.state != "idle":
        reply = await _handle_registration_flow(session, text, phone)
        if reply:
            return reply

    # Match commands (case-insensitive)
    if command == "HELP":
        return (
            "Available commands:\n"
            "REGISTER - Register as a farmer\n"
            "BOOK - Book a procurement slot\n"
            "STATUS - Check booking status\n"
            "QUEUE - Check queue position\n"
            "CENTRE - Find procurement centres\n"
            "PAYMENT - Check payment status\n"
            "HISTORY - View past transactions\n"
            "CANCEL - Cancel a booking\n"
            "RESCHEDULE - Reschedule a booking\n"
            "HELP - Show this message"
        )

    if command == "REGISTER":
        # Check if already registered
        async with async_session_factory() as db:
            existing = await farmer_service.get_by_phone(db, phone)
        if existing:
            return (
                f"You are already registered (ID: {existing.farmer_id}). "
                "Send HELP for available commands."
            )
        session.state = "awaiting_name"
        session.context = {}
        session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        return "Let's register you. Enter your full name."

    if command == "BOOK":
        return "Booking service coming soon. Send BOOK after full platform launch."

    if command == "STATUS":
        return "Send STATUS with your booking ID, e.g. STATUS BK-00001"

    if command == "QUEUE":
        return "Queue info will be available once you check in at a centre."

    if command == "CENTRE":
        parts = text.strip().split(maxsplit=1)
        pincode = parts[1].strip() if len(parts) > 1 else None
        if not pincode:
            async with async_session_factory() as db:
                farmer = await farmer_service.get_by_phone(db, phone)
            if farmer and farmer.pincode:
                pincode = farmer.pincode
            else:
                return "Send your pincode to find nearby centres, e.g. CENTRE 400001"
        if not (pincode.isdigit() and len(pincode) == 6):
            return "Please enter a valid 6-digit pincode, e.g. CENTRE 400001."
        markets, area = await mandi_service.find_markets_near(pincode)
        if not markets:
            return f"No procurement centres found near {pincode}."
        lines = [f"Centres near {pincode} ({area}):"]
        for m in markets[:3]:
            lines.append(f"- {m.name} ({m.distance_km} km)")
        return "\n".join(lines)

    if command == "PAYMENT":
        return "Payment info will be sent after your procurement is complete."

    if command == "HISTORY":
        return "History feature coming soon."

    if command == "CANCEL":
        return "Send CANCEL with your booking ID, e.g. CANCEL BK-00001"

    if command == "RESCHEDULE":
        return "Send RESCHEDULE with your booking ID, e.g. RESCHEDULE BK-00001"

    # Not a recognised command. Prompt again if we're mid-conversation, but stay
    # silent otherwise — this is likely a notice from e.g. Jio/your carrier that
    # never deserves a reply (and lets any new number still register via REGISTER).
    if session.state and session.state != "idle":
        return "Sorry, I didn't understand that. Send HELP for available commands."
    return None


@router.post("/sms/incoming")
async def handle_incoming_sms(request: Request) -> dict[str, str]:
    """Webhook endpoint for incoming SMS from SMS Gate.

    Accepts both the SMS Gate cloud envelope format
    ({ "event": "sms:received", "payload": { "message", "sender", ... } })
    and the flat format ({ message, sender, recipient }).
    """
    body = await request.json()
    payload = SMSWebhookPayload.from_envelope(body)

    phone = normalize_phone(payload.sender)
    text = payload.message.strip()

    logger.info("Incoming SMS from %s: %s", phone, text[:50])

    # Log incoming message
    async with async_session_factory() as db:
        msg = SMSMessage(
            phone=phone,
            direction="incoming",
            content=text,
            message_id=payload.messageId,
        )
        db.add(msg)

        # Get or create session (with duplicate detection)
        session = await _get_or_create_session(db, phone, payload.messageId)
        if not session:
            await db.commit()
            return {"status": "duplicate"}

        # Process message
        reply = await _handle_command(phone, text, session)
        await db.commit()

    # Send reply (best-effort: a delivery failure must not make the webhook
    # error, or SMS Gate would retry the whole incoming webhook and duplicate it)
    if reply:
        try:
            await _send_reply(phone, reply)
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to send SMS reply to %s: %s", phone, e)

    return {"status": "ok"}
