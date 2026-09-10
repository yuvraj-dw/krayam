"""Transactional SMS notifications for off-channel lifecycle events.

One rule: notifications must never raise. A missing/bad phone or a failed
send is logged and skipped so the API response is unaffected.

No AI here — the only AI in Krayam is the Gemini NL parser in the SMS
channel (app/services/intent.py). Centre ranking, wait-time ETA, and anomaly
flags are deterministic rule-based logic.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.booking import Booking
from app.models.centre import Centre
from app.models.farmer import Farmer
from app.models.payment import Payment
from app.models.procurement import Procurement
from app.models.sms import SMSMessage
from app.services.sms_format import format_currency, format_date
from app.services.sms_gate import sms_gate_client

logger = logging.getLogger(__name__)
settings = get_settings()


def _fmt_qty(quantity) -> str:
    """Render whole quantities without a trailing .0 (30 -> '30', 30.5 -> '30.5')."""
    val = float(quantity)
    return str(int(val)) if val == int(val) else str(val)


async def _centre_name(db: AsyncSession, centre_id) -> str:
    if not centre_id:
        return ""
    result = await db.execute(select(Centre.name).where(Centre.id == centre_id))
    name = result.scalar_one_or_none()
    return name or ""


async def _notify(db: AsyncSession, phone: str, message: str) -> None:
    """Write the audit row and (when enabled) send the SMS."""
    if not phone or not phone.strip():
        logger.warning("Skipping notification with no phone: %s", message)
        return
    db.add(SMSMessage(phone=phone, direction="outgoing", content=message, status="sent"))
    await db.flush()
    if not settings.SMS_NOTIFICATIONS_ENABLED:
        logger.info("SMS notifications disabled; logged message for %s", phone)
        return
    try:
        await sms_gate_client.send_sms(phone, message)
    except Exception:  # noqa: BLE001 - notifications must never break the request
        logger.warning("Notification send failed for %s: %s", phone, message, exc_info=True)


class NotificationService:
    async def notify_booking_confirmed(
        self, db: AsyncSession, booking: Booking, farmer: Farmer
    ) -> None:
        centre = await _centre_name(db, booking.centre_id)
        text = (
            f"Krayam: Booking {booking.booking_id} {_fmt_qty(booking.quantity)} "
            f"{booking.unit} {booking.crop} for {format_date(booking.expected_date)} "
            f"at {centre} is confirmed. Send STATUS for updates."
        )
        await _notify(db, farmer.phone, text)

    async def notify_booking_cancelled(
        self, db: AsyncSession, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Booking {booking.booking_id} ({booking.crop}, "
            f"{format_date(booking.expected_date)}) has been cancelled."
        )
        await _notify(db, farmer.phone, text)

    async def notify_booking_rescheduled(
        self, db: AsyncSession, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Booking {booking.booking_id} is rescheduled to "
            f"{format_date(booking.expected_date)}."
        )
        await _notify(db, farmer.phone, text)

    async def notify_procurement_completed(
        self,
        db: AsyncSession,
        procurement: Procurement,
        booking: Booking,
        farmer: Farmer,
    ) -> None:
        centre = await _centre_name(db, booking.centre_id)
        text = (
            f"Krayam: {_fmt_qty(procurement.accepted_quantity)} {procurement.unit} "
            f"{booking.crop} accepted at {centre}."
        )
        await _notify(db, farmer.phone, text)

    async def notify_payment_initiated(
        self, db: AsyncSession, payment: Payment, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Payment Rs.{format_currency(float(payment.amount))} for "
            f"{payment.payment_id} initiated. Send PAYMENT for status."
        )
        await _notify(db, farmer.phone, text)

    async def notify_payment_confirmed(
        self, db: AsyncSession, payment: Payment, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Payment Rs.{format_currency(float(payment.amount))} for "
            f"{booking.booking_id} confirmed by the mandi."
        )
        await _notify(db, farmer.phone, text)


notification_service = NotificationService()
