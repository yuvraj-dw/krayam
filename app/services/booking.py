import contextlib
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError, ValidationError
from app.models.booking import VALID_TRANSITIONS, Booking, BookingStatus
from app.schemas.procurement import BookingReschedule
from app.services.outbox import outbox_service
from app.services.slot import slot_service


def generate_booking_id() -> str:
    """Generate a human-readable booking ID like BK-8F32A."""
    return f"BK-{uuid.uuid4().hex[:5].upper()}"


class BookingService:
    async def create(
        self,
        db: AsyncSession,
        *,
        farmer_id: uuid.UUID,
        crop: str,
        quantity: float,
        expected_date: date,
        unit: str = "quintal",
        centre_id: uuid.UUID | None = None,
        slot_id: uuid.UUID | None = None,
        client_event_id: uuid.UUID | None = None,
    ) -> Booking:
        if quantity <= 0:
            raise ValidationError("Quantity must be greater than zero")
        if expected_date < date.today():
            raise ValidationError("Expected date cannot be in the past")

        if slot_id:
            await self._validate_slot(db, slot_id, expected_date)
        elif centre_id:
            await self._validate_slot_for_centre(db, centre_id, expected_date)

        booking = Booking(
            booking_id=generate_booking_id(),
            farmer_id=farmer_id,
            centre_id=centre_id,
            slot_id=slot_id,
            crop=crop,
            quantity=quantity,
            unit=unit,
            expected_date=expected_date,
            status=BookingStatus.CONFIRMED,
        )
        db.add(booking)
        await db.flush()
        await db.refresh(booking)
        if booking.centre_id:
            await slot_service.refresh_availability(db, booking.centre_id)
        await outbox_service.emit(
            db,
            event_type="booking.created",
            entity_type="booking",
            entity_id=booking.id,
            data={
                "booking_id": booking.booking_id,
                "crop": booking.crop,
                "quantity": float(booking.quantity),
                "unit": booking.unit,
                "expected_date": booking.expected_date.isoformat(),
            },
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="farmer",
            client_event_id=client_event_id,
        )
        return booking

    async def _validate_slot(
        self, db: AsyncSession, slot_id: uuid.UUID, expected_date: date
    ) -> None:
        slot = await slot_service.get_by_id(db, slot_id)
        if not slot.is_available or slot.date != expected_date:
            raise ValidationError("Selected slot is not available")
        if slot.current_bookings >= slot.max_bookings:
            raise ValidationError("Selected slot is at full capacity")

    async def _validate_slot_for_centre(
        self, db: AsyncSession, centre_id: uuid.UUID, expected_date: date
    ) -> None:
        available = await slot_service.list_available(db, centre_id, expected_date)
        if not available:
            raise ValidationError("No available slot on this date for this centre")

    async def get_by_id(self, db: AsyncSession, booking_id: uuid.UUID) -> Booking:
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if not booking:
            raise NotFoundError("Booking not found")
        return booking

    async def list_for_farmer(self, db: AsyncSession, farmer_id: uuid.UUID) -> list[Booking]:
        result = await db.execute(
            select(Booking)
            .where(Booking.farmer_id == farmer_id)
            .order_by(Booking.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_code(self, db: AsyncSession, code: str) -> Booking | None:
        """Look up a booking by its human-readable code (e.g. BK-8F32A)."""
        result = await db.execute(
            select(Booking).where(Booking.booking_id == code.strip().upper())
        )
        return result.scalar_one_or_none()

    async def transition(self, db: AsyncSession, booking: Booking, to: BookingStatus) -> Booking:
        """Validate and apply a booking status transition."""
        allowed = VALID_TRANSITIONS[booking.status]
        if to not in allowed:
            raise ValidationError(
                f"Cannot transition booking from {booking.status.value} to {to.value}"
            )
        booking.status = to
        await db.flush()
        await db.refresh(booking)
        if booking.slot_id and booking.centre_id:
            with contextlib.suppress(Exception):
                await slot_service.refresh_availability(db, booking.centre_id)
        return booking

    async def cancel(
        self, db: AsyncSession, booking: Booking, client_event_id: uuid.UUID | None = None
    ) -> Booking:
        booking = await self.transition(db, booking, BookingStatus.CANCELLED)
        await outbox_service.emit(
            db,
            event_type="booking.cancelled",
            entity_type="booking",
            entity_id=booking.id,
            data={"booking_id": booking.booking_id},
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="farmer",
            client_event_id=client_event_id,
        )
        return booking

    async def confirm(self, db: AsyncSession, booking: Booking) -> Booking:
        return await self.transition(db, booking, BookingStatus.CONFIRMED)

    async def reschedule(
        self,
        db: AsyncSession,
        booking: Booking,
        data: BookingReschedule,
        client_event_id: uuid.UUID | None = None,
    ) -> Booking:
        if booking.status not in (
            BookingStatus.CONFIRMED,
            BookingStatus.NO_SHOW,
            BookingStatus.EXPIRED,
        ):
            raise ValidationError("Only confirmed, no-show, or expired bookings can be rescheduled")

        new_date = data.expected_date or booking.expected_date
        new_centre = data.centre_id or booking.centre_id
        new_slot = data.slot_id or booking.slot_id

        if new_date < date.today():
            raise ValidationError("Expected date cannot be in the past")

        if new_slot:
            await self._validate_slot(db, new_slot, new_date)
        elif new_centre:
            await self._validate_slot_for_centre(db, new_centre, new_date)

        old_centre_id = booking.centre_id
        booking.expected_date = new_date
        booking.centre_id = new_centre
        booking.slot_id = new_slot
        booking.status = BookingStatus.CONFIRMED
        await db.flush()
        await db.refresh(booking)
        if booking.centre_id:
            await slot_service.refresh_availability(db, booking.centre_id)
        if old_centre_id and old_centre_id != booking.centre_id:
            await slot_service.refresh_availability(db, old_centre_id)
        await outbox_service.emit(
            db,
            event_type="booking.rescheduled",
            entity_type="booking",
            entity_id=booking.id,
            data={
                "booking_id": booking.booking_id,
                "expected_date": booking.expected_date.isoformat(),
                "centre_id": str(booking.centre_id) if booking.centre_id else None,
            },
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="farmer",
            client_event_id=client_event_id,
        )
        return booking


booking_service = BookingService()
