import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError, ValidationError
from app.models.booking import BookingStatus
from app.models.centre import CentreCrop
from app.models.procurement import Procurement
from app.services.booking import booking_service
from app.services.event import event_service
from app.services.outbox import outbox_service

DEFAULT_PRICE_RANGES = {
    "wheat": (2000.0, 3000.0),
    "rice": (1800.0, 2800.0),
    "paddy": (1800.0, 2800.0),
    "soybean": (3500.0, 5500.0),
    "mustard": (4000.0, 6000.0),
}
FALLBACK_PRICE_RANGE = (1000.0, 10000.0)


def generate_procurement_id() -> str:
    return f"PR-{uuid.uuid4().hex[:5].upper()}"


class ProcurementService:
    async def record(
        self,
        db: AsyncSession,
        *,
        booking_id: uuid.UUID,
        accepted_quantity: float,
        unit_price: float,
        quality_grade: str | None = None,
        unit: str = "quintal",
        quality_notes: str | None = None,
        client_event_id: uuid.UUID | None = None,
    ) -> Procurement:
        if accepted_quantity <= 0:
            raise ValidationError("Accepted quantity must be greater than zero")

        booking = await booking_service.get_by_id(db, booking_id)
        if booking.status not in (BookingStatus.PROCESSING, BookingStatus.CHECKED_IN):
            raise ValidationError(
                "Procurement can only be recorded during processing "
                f"(status {booking.status.value})"
            )

        centre_crop = None
        if booking.centre_id:
            res = await db.execute(
                select(CentreCrop).where(
                    CentreCrop.centre_id == booking.centre_id,
                    func.lower(CentreCrop.crop_name) == func.lower(booking.crop),
                    CentreCrop.is_active.is_(True),
                )
            )
            centre_crop = res.scalar_one_or_none()

        lower_crop = (booking.crop or "").strip().lower()
        def_min, def_max = DEFAULT_PRICE_RANGES.get(lower_crop, FALLBACK_PRICE_RANGE)
        min_price = (
            float(centre_crop.min_price_per_unit)
            if centre_crop and centre_crop.min_price_per_unit is not None
            else def_min
        )
        max_price = (
            float(centre_crop.max_price_per_unit)
            if centre_crop and centre_crop.max_price_per_unit is not None
            else def_max
        )

        if unit_price < min_price or unit_price > max_price:
            raise ValidationError(
                f"Offered price Rs.{unit_price:g} is outside permitted range "
                f"Rs.{min_price:g} - Rs.{max_price:g} per {unit} for {booking.crop}"
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
            unit_price=unit_price,
            quality_grade=quality_grade,
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
                "unit_price": unit_price,
                "quality_grade": quality_grade,
            },
        )
        await outbox_service.emit(
            db,
            event_type="procurement.recorded",
            entity_type="booking",
            entity_id=booking.id,
            data={
                "procurement_id": procurement.procurement_id,
                "accepted_quantity": accepted_quantity,
                "booked_quantity": float(booking.quantity),
                "unit_price": unit_price,
                "quality_grade": quality_grade,
            },
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
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
