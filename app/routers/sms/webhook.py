import contextlib
import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.exceptions import ValidationError
from app.models.booking import BookingStatus
from app.models.payment import Payment
from app.models.procurement import Procurement
from app.models.queue import QueueEntry
from app.models.sms import SMSMessage, SMSSession
from app.schemas.procurement import BookingReschedule
from app.services.booking import booking_service
from app.services.centre import centre_service
from app.services.farmer import farmer_service
from app.services.mandi import mandi_service
from app.services.queue import queue_service
from app.services.recommendation import recommendation_service
from app.services.slot import slot_service
from app.services.sms_format import (
    format_currency,
    format_date,
    parse_date,
    parse_int_selection,
    parse_positive_float,
)
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


async def _get_farmer(db: AsyncSession, phone: str):
    return await farmer_service.get_by_phone(db, phone)


async def _get_owned_booking(db: AsyncSession, phone: str, code: str):
    """Fetch a booking by human code, returning (booking, farmer). Returns
    (None, farmer) when the booking is missing or belongs to another farmer."""
    farmer = await _get_farmer(db, phone)
    if not farmer:
        return None, None
    booking = await booking_service.get_by_code(db, code)
    if booking is None or booking.farmer_id != farmer.id:
        return None, farmer
    return booking, farmer


async def _get_centre_name(db: AsyncSession, centre_id) -> str:
    if not centre_id:
        return "N/A"
    try:
        return (await centre_service.get_by_id(db, centre_id)).name
    except Exception:  # noqa: BLE001
        return "N/A"


async def _handle_booking_flow(
    db: AsyncSession, session: SMSSession, text: str, phone: str
) -> str | None:
    """Handle the multi-step SMS booking conversation (states prefixed bk_)."""
    ctx = session.context or {}
    state = session.state

    if state == "bk_crop":
        crop = text.strip()
        if not crop or len(crop) > 100:
            return "Please enter a valid crop name (e.g. Soybean)."
        session.context = {**ctx, "crop": crop}
        session.state = "bk_quantity"
        session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        return "Enter the quantity in quintals (e.g. 12)."

    if state == "bk_quantity":
        qty = parse_positive_float(text)
        if qty is None:
            return "Please enter a valid quantity in quintals (e.g. 12)."
        session.context = {**ctx, "quantity": qty}
        session.state = "bk_date"
        return "Enter the expected procurement date in DD-MM-YYYY (e.g. 15-09-2026)."

    if state == "bk_date":
        d = parse_date(text)
        if d is None or d < date.today():
            return "Please enter a valid future date in DD-MM-YYYY (e.g. 15-09-2026)."
        farmer = await _get_farmer(db, phone)
        if not farmer:
            return "You must register first. Send REGISTER."
        session.context = {**ctx, "expected_date": d.isoformat()}
        centres = await recommendation_service.recommend(
            db,
            crop=ctx["crop"],
            expected_date=d,
            farmer_lat=farmer.latitude or 20.59,
            farmer_lng=farmer.longitude or 78.96,
            pincode=farmer.pincode,
        )
        if not centres:
            session.state = "idle"
            session.context = {}
            return (
                "No centres currently accept this crop on your date. "
                "Try CENTRE <pincode> or pick a different crop/date."
            )
        kept = centres[:3]
        session.context = {
            **ctx,
            "expected_date": d.isoformat(),
            "candidates": [
                {
                    "centre_id": str(r.centre.id),
                    "name": r.centre.name,
                    "distance_km": r.distance_km,
                    "has_slots": r.has_slots,
                }
                for r in kept
            ],
        }
        session.state = "bk_centre"
        lines = ["Select a centre by replying with its number:"]
        for i, c in enumerate(kept, 1):
            slot = "slots available" if c.has_slots else "no slots"
            lines.append(f"{i}. {c.centre.name} ({c.distance_km:.1f} km, {slot})")
        return "\n".join(lines)

    if state == "bk_centre":
        idx = parse_int_selection(text)
        candidates = ctx.get("candidates") or []
        if idx is None or idx > len(candidates):
            return "Please reply with a valid centre number from the list."
        centre = candidates[idx - 1]
        d = date.fromisoformat(ctx["expected_date"])
        slots = await slot_service.list_available(
            db, uuid.UUID(centre["centre_id"]), d
        )
        if not slots:
            session.state = "bk_date"
            return (
                "No time slots available on that date for this centre. "
                "Enter another date in DD-MM-YYYY (e.g. 15-09-2026)."
            )
        session.context = {
            **ctx,
            "centre": centre,
            "slots": [
                {
                    "id": str(s.id),
                    "label": f"{s.start_time.strftime('%H:%M')}-{s.end_time.strftime('%H:%M')}",
                }
                for s in slots
            ],
        }
        session.state = "bk_slot"
        lines = ["Select a time slot by replying with its number:"]
        for i, s in enumerate(slots, 1):
            lines.append(
                f"{i}. {s.start_time.strftime('%H:%M')}-{s.end_time.strftime('%H:%M')}"
            )
        return "\n".join(lines)

    if state == "bk_slot":
        idx = parse_int_selection(text)
        slots = ctx.get("slots") or []
        if idx is None or idx > len(slots):
            return "Please reply with a valid slot number from the list."
        slot = slots[idx - 1]
        centre = ctx.get("centre") or {}
        farmer = await _get_farmer(db, phone)
        if not farmer:
            return "You must register first. Send REGISTER."
        d = date.fromisoformat(ctx["expected_date"])
        try:
            booking = await booking_service.create(
                db,
                farmer_id=farmer.id,
                crop=ctx["crop"],
                quantity=ctx["quantity"],
                expected_date=d,
                unit="quintal",
                centre_id=uuid.UUID(centre["centre_id"]),
                slot_id=uuid.UUID(slot["id"]),
            )
        except ValidationError as e:  # noqa: BLE001
            return str(e)
        session.state = "idle"
        session.context = {}
        centre_id = centre.get("centre_id")
        if centre_id:
            with contextlib.suppress(Exception):
                await slot_service.refresh_availability(db, uuid.UUID(centre_id))
        return (
            f"Booking confirmed! Ref: {booking.booking_id}\n"
            f"Crop: {booking.crop}\n"
            f"Qty: {booking.quantity} {booking.unit}\n"
            f"Centre: {centre.get('name', '')}\n"
            f"Date: {format_date(d)}\n"
            f"Slot: {slot['label']}\n"
            f"Status: {booking.status.value}\n"
            f"CANCEL or RESCHEDULE if this changes."
        )

    return None


async def _handle_command(
    db: AsyncSession, phone: str, text: str, session: SMSSession
) -> str | None:
    """Process a command or continue an active conversation. Returns None when
    the message should be ignored (e.g. a spam/service notice)."""
    stripped = text.strip()
    command = stripped.split(maxsplit=1)[0].upper() if stripped else ""

    # If in a conversation flow, continue it
    if session.state and session.state != "idle":
        if session.state.startswith("bk_"):
            reply = await _handle_booking_flow(db, session, text, phone)
        else:
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
        farmer = await _get_farmer(db, phone)
        if not farmer:
            session.state = "awaiting_name"
            session.context = {}
            return "You need to register first. Enter your full name to start."
        session.state = "bk_crop"
        session.context = {}
        session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        return "Let's make a booking. Enter the crop name (e.g. Soybean)."

    if command == "STATUS":
        parts = stripped.split(maxsplit=1)
        code = parts[1].strip() if len(parts) > 1 else None
        booking = None
        if code:
            booking, _ = await _get_owned_booking(db, phone, code)
            if not booking:
                return (
                    "Booking not found. Send STATUS for your latest booking "
                    "or STATUS <booking ID>."
                )
        else:
            farmer = await _get_farmer(db, phone)
            if not farmer:
                return "You must register first. Send REGISTER."
            bookings = await booking_service.list_for_farmer(db, farmer.id)
            booking = bookings[0] if bookings else None
        if not booking:
            return "No bookings found. Send BOOK to make one."
        centre_name = await _get_centre_name(db, booking.centre_id)
        return "\n".join(
            [
                f"Booking {booking.booking_id}: {booking.crop}",
                f"Qty: {booking.quantity} {booking.unit}",
                f"Centre: {centre_name}",
                f"Date: {format_date(booking.expected_date)}",
                f"Status: {booking.status.value}",
            ]
        )

    if command == "QUEUE":
        farmer = await _get_farmer(db, phone)
        if not farmer:
            return "You must register first. Send REGISTER."
        bookings = await booking_service.list_for_farmer(db, farmer.id)
        active = next(
            (
                b
                for b in bookings
                if b.status in (BookingStatus.CHECKED_IN, BookingStatus.PROCESSING)
            ),
            None,
        )
        if not active:
            return (
                "You have no active queue entry. Your booking must be checked "
                "in at a centre to appear in the queue. Send STATUS to check."
            )
        entry = (
            await db.execute(
                select(QueueEntry).where(QueueEntry.booking_id == active.id)
            )
        ).scalar_one_or_none()
        if not entry:
            return "You have no active queue entry."
        waiting = await queue_service.list_waiting(db, entry.centre_id)
        ahead = sum(
            1 for w in waiting if w.position < entry.position
        )
        eta = await queue_service.estimate_wait(db, entry.centre_id, entry.position)
        return "\n".join(
            [
                f"Queue position: {entry.position}",
                f"Ahead of you: {ahead}",
                f"Estimated wait: ~{eta} min",
                f"Status: {entry.status.value}",
            ]
        )

    if command == "CENTRE":
        parts = text.strip().split(maxsplit=1)
        pincode = parts[1].strip() if len(parts) > 1 else None
        if not pincode:
            farmer = await _get_farmer(db, phone)
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
        parts = stripped.split(maxsplit=1)
        code = parts[1].strip() if len(parts) > 1 else None
        farmer = await _get_farmer(db, phone)
        if not farmer:
            return "You must register first. Send REGISTER."
        rows = []
        if code:
            booking, _ = await _get_owned_booking(db, phone, code)
            if not booking:
                return "Booking not found or does not belong to you."
            proc = (
                await db.execute(
                    select(Procurement).where(Procurement.booking_id == booking.id)
                )
            ).scalar_one_or_none()
            if proc:
                rows = list(
                    (
                        await db.execute(
                            select(Payment)
                            .where(Payment.procurement_id == proc.id)
                            .order_by(Payment.created_at.desc())
                        )
                    ).scalars().all()
                )
        else:
            rows = list(
                (
                    await db.execute(
                        select(Payment)
                        .where(Payment.farmer_id == farmer.id)
                        .order_by(Payment.created_at.desc())
                        .limit(3)
                    )
                ).scalars().all()
            )
        if not rows:
            return (
                "No payments found yet. Payments appear after your "
                "procurement is accepted and verified."
            )
        lines = []
        for p in rows:
            lines.append(f"{p.payment_id}: Rs.{format_currency(p.amount)} ({p.status.value})")
        return "\n".join(lines)

    if command == "HISTORY":
        farmer = await _get_farmer(db, phone)
        if not farmer:
            return "You must register first. Send REGISTER."
        bookings = await booking_service.list_for_farmer(db, farmer.id)
        if not bookings:
            return "No booking history yet. Send BOOK to make your first booking."
        lines = []
        for b in bookings[:5]:
            lines.append(
                f"{b.booking_id}: {b.crop} {b.quantity:g} {b.unit} "
                f"{format_date(b.expected_date)} ({b.status.value})"
            )
        return "\n".join(lines)

    if command == "CANCEL":
        parts = stripped.split(maxsplit=1)
        if len(parts) < 2:
            return "Send CANCEL with your booking ID, e.g. CANCEL BK-8F32A"
        booking, _ = await _get_owned_booking(db, phone, parts[1])
        if not booking:
            return "Booking not found or does not belong to you."
        if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
            return f"Cannot cancel a booking in status {booking.status.value}."
        await booking_service.cancel(db, booking)
        return f"Booking {booking.booking_id} has been cancelled."

    if command == "RESCHEDULE":
        parts = stripped.split(maxsplit=2)
        if len(parts) < 3:
            return (
                "Send RESCHEDULE with your booking ID and new date, "
                "e.g. RESCHEDULE BK-8F32A 20-09-2026"
            )
        booking, _ = await _get_owned_booking(db, phone, parts[1])
        if not booking:
            return "Booking not found or does not belong to you."
        d = parse_date(parts[2])
        if d is None or d < date.today():
            return "Please enter a valid future date in DD-MM-YYYY format."
        try:
            booking = await booking_service.reschedule(
                db, booking, BookingReschedule(expected_date=d)
            )
        except ValidationError as e:  # noqa: BLE001
            return str(e)
        return (
            f"Booking {booking.booking_id} rescheduled to {format_date(d)}. "
            f"Status: {booking.status.value}."
        )

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
        reply = await _handle_command(db, phone, text, session)
        await db.commit()

    # Send reply (best-effort: a delivery failure must not make the webhook
    # error, or SMS Gate would retry the whole incoming webhook and duplicate it)
    if reply:
        try:
            await _send_reply(phone, reply)
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to send SMS reply to %s: %s", phone, e)

    return {"status": "ok"}
