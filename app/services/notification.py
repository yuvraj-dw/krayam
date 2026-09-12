"""Transactional and in-app notifications for lifecycle events.

One rule: notifications must never raise. A missing/bad phone or a failed
send is logged and skipped so the API response is unaffected.

No AI here — the only AI in Krayam is the Gemini NL parser in the SMS
channel (app/services/intent.py). Centre ranking, wait-time ETA, and anomaly
flags are deterministic rule-based logic.
"""

import logging
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.exceptions import NotFoundError
from app.models.booking import Booking
from app.models.centre import Centre
from app.models.farmer import Farmer
from app.models.notification import Notification
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


async def _record_notification(
    db: AsyncSession,
    *,
    farmer_id: uuid.UUID | None,
    phone: str,
    event_type: str,
    title: str,
    message: str,
    channel: str = "sms",
    status: str = "sent",
) -> None:
    """Write Notification and SMSMessage records and send external SMS if enabled.

    Must never raise exceptions to upstream callers.
    """
    try:
        clean_phone = phone.strip() if phone else ""
        if clean_phone:
            db.add(
                SMSMessage(
                    phone=clean_phone,
                    direction="outgoing",
                    content=message,
                    status=status,
                )
            )

        db.add(
            Notification(
                farmer_id=farmer_id,
                phone=clean_phone,
                channel=channel,
                event_type=event_type,
                title=title,
                message=message,
                status=status,
                is_read=False,
            )
        )
        await db.flush()

        if not clean_phone:
            logger.warning("Skipping SMS dispatch with no phone: %s", message)
            return

        if not settings.SMS_NOTIFICATIONS_ENABLED:
            logger.info("SMS notifications disabled; logged message for %s", clean_phone)
            return

        try:
            await sms_gate_client.send_sms(clean_phone, message)
        except Exception:  # noqa: BLE001
            logger.warning("Notification SMS send failed for %s: %s", clean_phone, message, exc_info=True)
    except Exception:  # noqa: BLE001 - notifications must never break the caller
        logger.warning(
            "Failed to record notification for farmer %s: %s",
            farmer_id,
            message,
            exc_info=True,
        )


class NotificationService:
    async def notify_booking_confirmed(
        self, db: AsyncSession, booking: Booking, farmer: Farmer
    ) -> None:
        centre = await _centre_name(db, booking.centre_id)
        at_centre = f" at {centre}" if centre else ""
        text = (
            f"Krayam: Booking {booking.booking_id} {_fmt_qty(booking.quantity)} "
            f"{booking.unit} {booking.crop} for {format_date(booking.expected_date)}"
            f"{at_centre} is confirmed. Send STATUS for updates."
        )
        await _record_notification(
            db,
            farmer_id=farmer.id,
            phone=farmer.phone,
            event_type="BOOKING_CONFIRMED",
            title="Booking Confirmed",
            message=text,
        )

    async def notify_booking_cancelled(
        self, db: AsyncSession, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Booking {booking.booking_id} ({booking.crop}, "
            f"{format_date(booking.expected_date)}) has been cancelled."
        )
        await _record_notification(
            db,
            farmer_id=farmer.id,
            phone=farmer.phone,
            event_type="BOOKING_CANCELLED",
            title="Booking Cancelled",
            message=text,
        )

    async def notify_booking_rescheduled(
        self, db: AsyncSession, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Booking {booking.booking_id} is rescheduled to "
            f"{format_date(booking.expected_date)}."
        )
        await _record_notification(
            db,
            farmer_id=farmer.id,
            phone=farmer.phone,
            event_type="BOOKING_RESCHEDULED",
            title="Booking Rescheduled",
            message=text,
        )

    async def notify_procurement_completed(
        self,
        db: AsyncSession,
        procurement: Procurement,
        booking: Booking,
        farmer: Farmer,
    ) -> None:
        centre = await _centre_name(db, booking.centre_id)
        at_centre = f" at {centre}" if centre else ""
        text = (
            f"Krayam: {_fmt_qty(procurement.accepted_quantity)} {procurement.unit} "
            f"{booking.crop} accepted{at_centre}."
        )
        await _record_notification(
            db,
            farmer_id=farmer.id,
            phone=farmer.phone,
            event_type="PROCUREMENT_COMPLETED",
            title="Procurement Completed",
            message=text,
        )

    async def notify_payment_initiated(
        self, db: AsyncSession, payment: Payment, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Payment Rs.{format_currency(float(payment.amount))} for "
            f"{payment.payment_id} initiated. Send PAYMENT for status."
        )
        await _record_notification(
            db,
            farmer_id=farmer.id,
            phone=farmer.phone,
            event_type="PAYMENT_INITIATED",
            title="Payment Initiated",
            message=text,
        )

    async def notify_payment_confirmed(
        self, db: AsyncSession, payment: Payment, booking: Booking, farmer: Farmer
    ) -> None:
        text = (
            f"Krayam: Payment Rs.{format_currency(float(payment.amount))} for "
            f"{booking.booking_id} confirmed by the mandi."
        )
        await _record_notification(
            db,
            farmer_id=farmer.id,
            phone=farmer.phone,
            event_type="PAYMENT_CONFIRMED",
            title="Payment Confirmed",
            message=text,
        )

    async def list_for_farmer(
        self,
        db: AsyncSession,
        farmer_id: uuid.UUID,
        *,
        is_read: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Notification], int, int]:
        """List notifications for farmer, total matching count, and overall unread count."""
        base_filter = [Notification.farmer_id == farmer_id]
        if is_read is not None:
            base_filter.append(Notification.is_read == is_read)

        total_stmt = select(func.count(Notification.id)).where(*base_filter)
        unread_stmt = select(func.count(Notification.id)).where(
            Notification.farmer_id == farmer_id,
            Notification.is_read.is_(False),
        )
        items_stmt = (
            select(Notification)
            .where(*base_filter)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        total_res = await db.execute(total_stmt)
        total = total_res.scalar_one()

        unread_res = await db.execute(unread_stmt)
        unread_count = unread_res.scalar_one()

        items_res = await db.execute(items_stmt)
        items = list(items_res.scalars().all())

        return items, total, unread_count

    async def mark_as_read(
        self, db: AsyncSession, notification_id: uuid.UUID, farmer_id: uuid.UUID
    ) -> Notification:
        """Mark a single notification as read for a given farmer."""
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.farmer_id == farmer_id,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotFoundError("Notification not found")

        notification.is_read = True
        await db.flush()
        return notification

    async def mark_all_as_read(self, db: AsyncSession, farmer_id: uuid.UUID) -> int:
        """Mark all unread notifications as read for a given farmer."""
        stmt = (
            update(Notification)
            .where(
                Notification.farmer_id == farmer_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
        )
        result = await db.execute(stmt)
        await db.flush()
        return result.rowcount or 0


notification_service = NotificationService()
