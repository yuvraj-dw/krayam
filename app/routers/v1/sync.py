import typing
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, get_db
from app.dependencies import get_current_operator, require_same_centre
from app.exceptions import AuthorizationError, ValidationError
from app.models.booking import Booking
from app.models.operator import Operator
from app.models.outbox import OutboxEvent
from app.models.procurement import Procurement
from app.models.queue import QueueEntry
from app.schemas.events import OutboxEventResponse
from app.schemas.operations import QueueEntryResponse
from app.schemas.procurement import BookingResponse
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncCentreInfo,
    SyncCropInfo,
    SyncEventIn,
    SyncEventResult,
    SyncPullResponse,
    SyncSlotInfo,
    SyncSnapshotResponse,
)
from app.services.booking import booking_service
from app.services.centre import centre_service
from app.services.outbox import outbox_service
from app.services.payment import payment_service
from app.services.procurement import procurement_service
from app.services.queue import queue_service
from app.services.slot import slot_service

router = APIRouter(prefix="/sync", tags=["sync"])

PULL_LIMIT_MAX = 500
ALLOWED_OFFLINE_EVENTS = {
    "queue.check_in",
    "queue.called",
    "queue.no_show",
    "queue.processing_started",
    "queue.processing_completed",
    "procurement.recorded",
}


def _uuid(value: object) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


@router.get("/{centre_id}/snapshot", response_model=SyncSnapshotResponse)
async def sync_snapshot(
    centre_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> SyncSnapshotResponse:
    require_same_centre(centre_id, operator.centre_id)
    centre = await centre_service.get_by_id(db, centre_id)
    today_local = datetime.now().date()
    today_utc = datetime.now(timezone.utc).date()
    days = list({today_local, today_utc})
    slots = await slot_service.list_available(db, centre_id, today_local)
    booking_rows = (
        await db.execute(
            select(Booking)
            .where(Booking.centre_id == centre_id, Booking.expected_date.in_(days))
            .order_by(Booking.created_at.asc())
        )
    ).scalars().all()
    waitlist = await queue_service.list_waiting(db, centre_id)
    return SyncSnapshotResponse(
        centre=SyncCentreInfo.model_validate(centre),
        crops=[SyncCropInfo.model_validate(c) for c in centre.crops],
        slots=[SyncSlotInfo.model_validate(s) for s in slots],
        bookings=[BookingResponse.model_validate(b) for b in booking_rows],
        waitlist=[QueueEntryResponse.model_validate(e) for e in waitlist],
    )


@router.get("/{centre_id}/events", response_model=SyncPullResponse)
async def sync_pull(
    centre_id: uuid.UUID,
    cursor: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=PULL_LIMIT_MAX),
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> SyncPullResponse:
    require_same_centre(centre_id, operator.centre_id)
    rows = await outbox_service.pull(
        db, centre_id=centre_id, cursor=cursor, limit=limit + 1
    )
    has_more = len(rows) > limit
    events = [OutboxEventResponse.model_validate(r) for r in rows[:limit]]
    next_cursor = events[-1].id if events else cursor
    return SyncPullResponse(events=events, next_cursor=next_cursor, has_more=has_more)


async def _current_state(
    db: AsyncSession, centre_id: uuid.UUID, event: SyncEventIn
) -> dict[str, typing.Any] | None:
    """Resolve the server-side current state for an offline event's target."""
    payload = event.payload or {}
    if event.type in (
        "queue.no_show",
        "queue.processing_started",
        "queue.processing_completed",
    ):
        entry_id = _uuid(payload.get("queue_entry_id"))
        if entry_id is None:
            return None
        entry = (
            await db.execute(select(QueueEntry).where(QueueEntry.id == entry_id))
        ).scalar_one_or_none()
        if entry is None:
            return None
        return {"queue_entry_id": str(entry.id), "status": entry.status.value}
    if event.type == "queue.check_in":
        booking_id = _uuid(payload.get("booking_id"))
        if booking_id is None:
            return None
        booking = (
            await db.execute(select(Booking).where(Booking.id == booking_id))
        ).scalar_one_or_none()
        if booking is None:
            return None
        return {"booking_id": str(booking.id), "status": booking.status.value}
    if event.type == "queue.called":
        waiting = await queue_service.list_waiting(db, centre_id)
        return {"waiting_count": len(waiting)}
    if event.type == "procurement.recorded":
        booking_id = _uuid(payload.get("booking_id"))
        if booking_id is None:
            return None
        booking = (
            await db.execute(select(Booking).where(Booking.id == booking_id))
        ).scalar_one_or_none()
        if booking is None:
            return None
        return {"booking_id": str(booking.id), "status": booking.status.value}
    return None


async def _dispatch(db: AsyncSession, operator: Operator, event: SyncEventIn) -> None:
    payload = event.payload or {}
    centre_id = operator.centre_id
    if event.type == "queue.check_in":
        booking_id = _uuid(payload.get("booking_id"))
        if booking_id is None:
            raise ValidationError("Missing booking_id")
        await queue_service.check_in(
            db,
            booking_id=booking_id,
            centre_id=centre_id,
            client_event_id=event.client_event_id,
        )
    elif event.type == "queue.called":
        await queue_service.call_next(
            db, centre_id=centre_id, client_event_id=event.client_event_id
        )
    elif event.type == "queue.no_show":
        entry_id = _uuid(payload.get("queue_entry_id"))
        if entry_id is None:
            raise ValidationError("Missing queue_entry_id")
        await queue_service.mark_no_show(
            db, entry_id, client_event_id=event.client_event_id
        )
    elif event.type == "queue.processing_started":
        entry_id = _uuid(payload.get("queue_entry_id"))
        if entry_id is None:
            raise ValidationError("Missing queue_entry_id")
        await queue_service.start_processing(
            db, entry_id, client_event_id=event.client_event_id
        )
    elif event.type == "queue.processing_completed":
        entry_id = _uuid(payload.get("queue_entry_id"))
        if entry_id is None:
            raise ValidationError("Missing queue_entry_id")
        await queue_service.complete_processing(
            db, entry_id, client_event_id=event.client_event_id
        )
    elif event.type == "procurement.recorded":
        booking_id = _uuid(payload.get("booking_id"))
        if booking_id is None:
            raise ValidationError("Missing booking_id")
        booking = await booking_service.get_by_id(db, booking_id)
        if booking.centre_id != centre_id:
            raise AuthorizationError("Booking does not belong to this centre")
        quantity = payload.get("accepted_quantity")
        if quantity is None:
            raise ValidationError("Missing accepted_quantity")
        quality_notes = payload.get("quality_notes")
        procurement = await procurement_service.record(
            db,
            booking_id=booking_id,
            accepted_quantity=float(quantity),
            quality_notes=str(quality_notes) if quality_notes else None,
            client_event_id=event.client_event_id,
        )
        # Spec Decision 5: payment is derived server-side at sync, initiated only.
        await payment_service.create_for_procurement(db, procurement)
    else:
        raise ValidationError("Event type not synchronisable offline")


async def _apply_event(operator: Operator, event: SyncEventIn) -> SyncEventResult:
    async with async_session_factory() as db:
        existing = (
            await db.execute(
                select(OutboxEvent).where(
                    OutboxEvent.client_event_id == event.client_event_id
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            return SyncEventResult(
                client_event_id=event.client_event_id, status="duplicate"
            )

        # Duplicate check for queue.check_in (booking already in queue)
        if event.type == "queue.check_in":
            booking_id = _uuid(event.payload.get("booking_id"))
            if booking_id:
                entry = (
                    await db.execute(
                        select(QueueEntry).where(QueueEntry.booking_id == booking_id)
                    )
                ).scalar_one_or_none()
                if entry is not None:
                    return SyncEventResult(
                        client_event_id=event.client_event_id, status="duplicate"
                    )

        # Duplicate check for procurement.recorded (procurement already recorded)
        if event.type == "procurement.recorded":
            booking_id = _uuid(event.payload.get("booking_id"))
            if booking_id:
                proc = (
                    await db.execute(
                        select(Procurement).where(Procurement.booking_id == booking_id)
                    )
                ).scalar_one_or_none()
                if proc is not None:
                    return SyncEventResult(
                        client_event_id=event.client_event_id, status="duplicate"
                    )

        state = await _current_state(db, operator.centre_id, event)
        if state is None:
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="rejected",
                error="Target entity not found",
            )

        expected = event.expected_current_state or {}
        for key, value in expected.items():
            if state.get(key) != value:
                return SyncEventResult(
                    client_event_id=event.client_event_id,
                    status="conflicting",
                    server_current_state=state,
                )

        before = await outbox_service.max_id(db)
        try:
            await _dispatch(db, operator, event)
        except Exception as exc:  # noqa: BLE001 - rejected on any service error
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="rejected",
                error=str(exc),
            )
        await outbox_service.publish_after(
            db, centre_id=operator.centre_id, after=before
        )
        return SyncEventResult(client_event_id=event.client_event_id, status="accepted")


@router.post("/{centre_id}/events", response_model=SyncBatchResponse)
async def sync_apply(
    centre_id: uuid.UUID,
    body: SyncBatchRequest,
    operator: Operator = Depends(get_current_operator),
) -> SyncBatchResponse:
    require_same_centre(centre_id, operator.centre_id)
    results = [await _apply_event(operator, e) for e in body.events]
    return SyncBatchResponse(results=results)
