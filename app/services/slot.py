import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot


class SlotService:
    async def create(self, db: AsyncSession, data) -> Slot:
        existing = await db.execute(
            select(Slot).where(
                Slot.centre_id == data.centre_id,
                Slot.date == data.date,
                Slot.start_time == data.start_time,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError("A slot at this time already exists for this centre")
        slot = Slot(**data.model_dump(exclude={"centre_id"}), centre_id=data.centre_id)
        db.add(slot)
        await db.flush()
        await db.refresh(slot)
        return slot

    async def list_available(
        self, db: AsyncSession, centre_id: uuid.UUID, on_date: date | None = None
    ) -> list[Slot]:
        query = select(Slot).where(Slot.centre_id == centre_id, Slot.is_available.is_(True))
        if on_date:
            query = query.where(Slot.date == on_date)
        result = await db.execute(query.order_by(Slot.date, Slot.start_time))
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, slot_id: uuid.UUID) -> Slot:
        result = await db.execute(select(Slot).where(Slot.id == slot_id))
        slot = result.scalar_one_or_none()
        if not slot:
            raise NotFoundError("Slot not found")
        return slot

    async def refresh_availability(self, db: AsyncSession, centre_id: uuid.UUID) -> None:
        """Recount current bookings for a centre's slots and update availability."""
        for slot in await self.list_available(db, centre_id):
            count = await db.scalar(
                select(func.count(Booking.id)).where(
                    Booking.slot_id == slot.id,
                    Booking.status.notin_(
                        [BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.NO_SHOW]
                    ),
                )
            )
            slot.current_bookings = count
            slot.is_available = count < slot.max_bookings
            if count > slot.max_bookings:
                raise ValidationError(
                    f"Slot {slot.id} is over capacity ({count}/{slot.max_bookings})"
                )
        await db.flush()


slot_service = SlotService()
