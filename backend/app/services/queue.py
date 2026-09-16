import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError, ValidationError
from app.models.booking import BookingStatus
from app.models.queue import QueueEntry, QueueStatus
from app.services.booking import booking_service
from app.services.event import event_service
from app.services.outbox import outbox_service

# ponytail: rule-based per-farmer processing time estimate (minutes).
# Pure prototype value; replaceable by phase 10 ML module behind the same call site.
AVG_PROCESS_MINUTES = 10
ACTIVE_COUNTERS = 2


class QueueService:
    async def check_in(
        self,
        db: AsyncSession,
        *,
        booking_id: uuid.UUID,
        centre_id: uuid.UUID,
        client_event_id: uuid.UUID | None = None,
    ) -> QueueEntry:
        booking = await booking_service.get_by_id(db, booking_id)
        if booking.centre_id != centre_id:
            raise ValidationError("Booking does not belong to this centre")
        if booking.status not in (BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN):
            raise ValidationError(f"Cannot check in booking in status {booking.status.value}")

        existing = (
            await db.execute(
                select(QueueEntry).where(QueueEntry.booking_id == booking_id)
            )
        ).scalar_one_or_none()
        if existing:
            raise ValidationError("Booking already in queue")

        pos = await self._next_position(db, centre_id)
        entry = QueueEntry(
            booking_id=booking_id,
            centre_id=centre_id,
            position=pos,
            status=QueueStatus.WAITING,
            checked_in_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)

        await booking_service.transition(db, booking, BookingStatus.CHECKED_IN)
        await event_service.record(
            db,
            event_type="farmer_checked_in",
            entity_type="booking",
            entity_id=booking.id,
            data={"centre_id": str(centre_id), "position": pos},
        )
        await outbox_service.emit(
            db,
            event_type="queue.check_in",
            entity_type="booking",
            entity_id=booking.id,
            data={"queue_entry_id": str(entry.id), "position": pos},
            centre_id=centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
        )
        await db.commit()
        return entry

    async def _next_position(self, db: AsyncSession, centre_id: uuid.UUID) -> int:
        result = await db.execute(
            select(QueueEntry.position)
            .where(
                QueueEntry.centre_id == centre_id,
                QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
            )
            .order_by(QueueEntry.position.desc())
            .limit(1)
        )
        last = result.scalar()
        return (last or 0) + 1

    async def call_next(
        self, db: AsyncSession, centre_id: uuid.UUID, client_event_id: uuid.UUID | None = None
    ) -> QueueEntry | None:
        result = await db.execute(
            select(QueueEntry)
            .where(
                QueueEntry.centre_id == centre_id,
                QueueEntry.status == QueueStatus.WAITING,
            )
            .order_by(QueueEntry.position.asc())
            .limit(1)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise NotFoundError("No farmers waiting in queue")
        entry.status = QueueStatus.CALLED
        entry.called_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(entry)
        await event_service.record(
            db,
            event_type="farmer_called",
            entity_type="booking",
            entity_id=entry.booking_id,
            data={"queue_entry_id": str(entry.id)},
        )
        booking = await booking_service.get_by_id(db, entry.booking_id)
        await outbox_service.emit(
            db,
            event_type="queue.called",
            entity_type="booking",
            entity_id=booking.id,
            data={"queue_entry_id": str(entry.id), "position": entry.position},
            centre_id=centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
        )
        await db.commit()
        return entry

    async def mark_no_show(
        self, db: AsyncSession, queue_entry_id: uuid.UUID, client_event_id: uuid.UUID | None = None
    ) -> QueueEntry:
        entry = await self.get_entry(db, queue_entry_id)
        if entry.status not in (QueueStatus.WAITING, QueueStatus.CALLED):
            raise ValidationError("Only waiting/called farmers can be marked no-show")
        entry.status = QueueStatus.NO_SHOW
        await db.flush()
        await db.refresh(entry)
        booking = await booking_service.get_by_id(db, entry.booking_id)
        await booking_service.transition(db, booking, BookingStatus.NO_SHOW)
        await event_service.record(
            db,
            event_type="farmer_no_show",
            entity_type="booking",
            entity_id=booking.id,
        )
        await outbox_service.emit(
            db,
            event_type="queue.no_show",
            entity_type="booking",
            entity_id=booking.id,
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
        )
        await db.commit()
        return entry

    async def start_processing(
        self, db: AsyncSession, queue_entry_id: uuid.UUID, client_event_id: uuid.UUID | None = None
    ) -> QueueEntry:
        entry = await self.get_entry(db, queue_entry_id)
        if entry.status != QueueStatus.CALLED:
            raise ValidationError("Only a called farmer can start processing")
        entry.status = QueueStatus.PROCESSING
        entry.processing_start = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(entry)
        booking = await booking_service.get_by_id(db, entry.booking_id)
        await booking_service.transition(db, booking, BookingStatus.PROCESSING)
        await event_service.record(
            db,
            event_type="processing_started",
            entity_type="booking",
            entity_id=booking.id,
        )
        await outbox_service.emit(
            db,
            event_type="queue.processing_started",
            entity_type="booking",
            entity_id=booking.id,
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
        )
        await db.commit()
        return entry

    async def complete_processing(
        self, db: AsyncSession, queue_entry_id: uuid.UUID, client_event_id: uuid.UUID | None = None
    ) -> QueueEntry:
        entry = await self.get_entry(db, queue_entry_id)
        if entry.status != QueueStatus.PROCESSING:
            raise ValidationError("Only a processing farmer can be completed")
        entry.status = QueueStatus.COMPLETED
        entry.processing_end = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(entry)
        booking = await booking_service.get_by_id(db, entry.booking_id)
        await booking_service.transition(db, booking, BookingStatus.COMPLETED)
        await event_service.record(
            db,
            event_type="processing_completed",
            entity_type="booking",
            entity_id=booking.id,
        )
        await outbox_service.emit(
            db,
            event_type="queue.processing_completed",
            entity_type="booking",
            entity_id=booking.id,
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
        )
        await db.commit()
        return entry

    async def get_entry(self, db: AsyncSession, queue_entry_id: uuid.UUID) -> QueueEntry:
        result = await db.execute(select(QueueEntry).where(QueueEntry.id == queue_entry_id))
        entry = result.scalar_one_or_none()
        if not entry:
            raise NotFoundError("Queue entry not found")
        return entry

    async def list_waiting(self, db: AsyncSession, centre_id: uuid.UUID) -> list[QueueEntry]:
        result = await db.execute(
            select(QueueEntry)
            .where(
                QueueEntry.centre_id == centre_id,
                QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]),
            )
            .order_by(QueueEntry.position.asc())
        )
        return list(result.scalars().all())

    async def estimate_wait(
        self, db: AsyncSession, centre_id: uuid.UUID, position: int | None = None
    ) -> int:
        """Rule-based ETA in minutes. Fallback when ML module unavailable."""
        waiting = await self.list_waiting(db, centre_id)
        ahead = (
            max(0, position - 1)
            if position is not None and position > 0
            else len(waiting)
        )
        cycles = ahead // ACTIVE_COUNTERS
        return cycles * AVG_PROCESS_MINUTES

    async def renumber(self, db: AsyncSession, centre_id: uuid.UUID) -> None:
        waiting = await self.list_waiting(db, centre_id)
        for idx, entry in enumerate(waiting, start=1):
            entry.position = idx
        await db.flush()


queue_service = QueueService()
