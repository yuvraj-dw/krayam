import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError, ValidationError
from app.models.booking import BookingStatus
from app.models.procurement import Procurement
from app.services.booking import booking_service
from app.services.event import event_service


def generate_procurement_id() -> str:
    return f"PR-{uuid.uuid4().hex[:5].upper()}"


class ProcurementService:
    async def record(
        self,
        db: AsyncSession,
        *,
        booking_id: uuid.UUID,
        accepted_quantity: float,
        unit: str = "quintal",
        quality_notes: str | None = None,
    ) -> Procurement:
        if accepted_quantity <= 0:
            raise ValidationError("Accepted quantity must be greater than zero")

        booking = await booking_service.get_by_id(db, booking_id)
        if booking.status not in (BookingStatus.PROCESSING, BookingStatus.CHECKED_IN):
            raise ValidationError(
                "Procurement can only be recorded during processing "
                f"(status {booking.status.value})"
            )

        existing = (
            await db.execute(select(Procurement).where(Procurement.booking_id == booking_id))
        ).scalar_one_or_none()
        if existing:
            raise ValidationError("Procurement already recorded for this booking")

        procurement = Procurement(
            procurement_id=generate_procurement_id(),
            booking_id=booking.id,
            accepted_quantity=accepted_quantity,
            unit=unit,
            quality_notes=quality_notes,
        )
        db.add(procurement)
        await db.flush()
        await db.refresh(procurement)
        await event_service.record(
            db,
            event_type="procurement_recorded",
            entity_type="booking",
            entity_id=booking.id,
            data={
                "procurement_id": procurement.procurement_id,
                "accepted_quantity": accepted_quantity,
                "booked_quantity": float(booking.quantity),
            },
        )
        await db.commit()
        return procurement

    async def get_by_id(self, db: AsyncSession, procurement_id: uuid.UUID) -> Procurement:
        result = await db.execute(
            select(Procurement).where(Procurement.id == procurement_id)
        )
        procurement = result.scalar_one_or_none()
        if not procurement:
            raise NotFoundError("Procurement not found")
        return procurement

    async def complete(self, db: AsyncSession, procurement_id: uuid.UUID) -> Procurement:
        procurement = await self.get_by_id(db, procurement_id)
        if procurement.status != "pending":
            raise ValidationError("Only pending procurements can be completed")
        procurement.status = "completed"
        procurement.processing_end = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(procurement)
        await event_service.record(
            db,
            event_type="procurement_completed",
            entity_type="booking",
            entity_id=procurement.booking_id,
            data={"procurement_id": procurement.procurement_id},
        )
        await db.commit()
        return procurement


procurement_service = ProcurementService()
