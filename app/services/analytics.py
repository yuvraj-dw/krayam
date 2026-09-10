import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.models.procurement import Procurement
from app.models.queue import QueueEntry, QueueStatus
from app.schemas.analytics import AnalyticsSummary

LOCAL_TZ = "Asia/Kolkata"


class AnalyticsService:
    async def summary(
        self,
        db: AsyncSession,
        *,
        centre_id: uuid.UUID,
        from_date: date,
        to_date: date,
    ) -> AnalyticsSummary:
        start = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(to_date, time.max, tzinfo=timezone.utc)

        row = (
            await db.execute(
                select(
                    func.count(Procurement.id),
                    func.coalesce(func.sum(Procurement.accepted_quantity), 0.0),
                )
                .join(Booking, Booking.id == Procurement.booking_id)
                .where(
                    Booking.centre_id == centre_id,
                    Procurement.created_at.between(start, end),
                )
            )
        ).one()
        served, total_qty = row[0], row[1]

        row = (
            await db.execute(
                select(
                    func.avg(
                        func.extract(
                            "epoch",
                            QueueEntry.processing_start - QueueEntry.checked_in_at,
                        )
                        / 60.0
                    ),
                    func.avg(
                        func.extract(
                            "epoch",
                            QueueEntry.processing_end - QueueEntry.processing_start,
                        )
                        / 60.0
                    ),
                )
                .where(
                    QueueEntry.centre_id == centre_id,
                    QueueEntry.status == QueueStatus.COMPLETED,
                    QueueEntry.processing_end.between(start, end),
                )
            )
        ).one()
        wait, process = row[0], row[1]

        no_shows = (
            await db.execute(
                select(func.count(QueueEntry.id)).where(
                    QueueEntry.centre_id == centre_id,
                    QueueEntry.status == QueueStatus.NO_SHOW,
                    QueueEntry.checked_in_at.between(start, end),
                )
            )
        ).scalar()

        cancellations = (
            await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.centre_id == centre_id,
                    Booking.status == BookingStatus.CANCELLED,
                    Booking.updated_at.between(start, end),
                )
            )
        ).scalar()

        row = (
            await db.execute(
                select(
                    func.count(Payment.id),
                    func.coalesce(func.sum(Payment.amount), 0.0),
                )
                .join(Procurement, Procurement.id == Payment.procurement_id)
                .join(Booking, Booking.id == Procurement.booking_id)
                .where(
                    Booking.centre_id == centre_id,
                    Payment.status.in_(
                        [PaymentStatus.INITIATED, PaymentStatus.PENDING_VERIFICATION]
                    ),
                )
            )
        ).one()
        pending_count, pending_amount = row[0], row[1]

        row = (
            await db.execute(
                select(
                    func.count(Payment.id),
                    func.coalesce(func.sum(Payment.amount), 0.0),
                )
                .join(Procurement, Procurement.id == Payment.procurement_id)
                .join(Booking, Booking.id == Procurement.booking_id)
                .where(
                    Booking.centre_id == centre_id,
                    Payment.status == PaymentStatus.CONFIRMED,
                    Payment.confirmed_at.is_not(None),
                    Payment.confirmed_at.between(start, end),
                )
            )
        ).one()
        done_count, done_amount = row[0], row[1]

        hour_expr = func.extract(
            "hour", QueueEntry.checked_in_at.op("AT TIME ZONE")(LOCAL_TZ)
        )
        arrival_rows = (
            await db.execute(
                select(hour_expr, func.count(QueueEntry.id))
                .where(
                    QueueEntry.centre_id == centre_id,
                    QueueEntry.checked_in_at.between(start, end),
                )
                .group_by(hour_expr)
            )
        ).all()
        arrivals_by_hour = {int(hour): int(count) for hour, count in arrival_rows}
        peak_hour = (
            max(arrivals_by_hour, key=lambda h: (arrivals_by_hour[h], -h))
            if arrivals_by_hour
            else None
        )

        return AnalyticsSummary(
            centre_id=centre_id,
            from_date=from_date,
            to_date=to_date,
            farmers_served=int(served),
            total_quantity_procured=round(float(total_qty), 2),
            avg_waiting_minutes=round(float(wait), 1) if wait is not None else None,
            avg_processing_minutes=round(float(process), 1)
            if process is not None
            else None,
            no_shows=int(no_shows or 0),
            cancellations=int(cancellations or 0),
            pending_payments_count=int(pending_count),
            pending_payments_amount=round(float(pending_amount), 2),
            completed_payments_count=int(done_count),
            completed_payments_amount=round(float(done_amount), 2),
            arrivals_by_hour=arrivals_by_hour,
            peak_hour=peak_hour,
        )


analytics_service = AnalyticsService()
