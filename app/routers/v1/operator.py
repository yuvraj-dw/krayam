import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import NotFoundError
from app.models.centre import Centre
from app.models.payment import Payment, PaymentStatus
from app.models.procurement import Procurement
from app.models.queue import QueueEntry
from app.schemas.operations import (
    CallNextRequest,
    CheckInRequest,
    EventResponse,
    PaymentResponse,
    PaymentReviewRequest,
    ProcurementRecordRequest,
    ProcurementResponse,
    QueueEntryResponse,
    QueueSummary,
)
from app.services.booking import booking_service
from app.services.event import event_service
from app.services.farmer import farmer_service
from app.services.notification import notification_service
from app.services.payment import payment_service
from app.services.procurement import procurement_service
from app.services.queue import queue_service

router = APIRouter(prefix="/operator", tags=["operator"])


# ponytail: no operator role system yet (plan: "no admin roles in prototype").
# Auth for operator actions is deferred; service-layer guards still apply.


async def _get_centre(db: AsyncSession, centre_id: uuid.UUID) -> Centre:
    from app.services.centre import centre_service

    centre = await centre_service.get_by_id(db, centre_id)
    if not centre:
        raise NotFoundError("Centre not found")
    return centre


@router.post("/check-in", response_model=QueueEntryResponse)
async def check_in_farmer(
    body: CheckInRequest,
    db: AsyncSession = Depends(get_db),
) -> QueueEntry:
    await _get_centre(db, body.centre_id)
    return QueueEntryResponse.model_validate(
        await queue_service.check_in(db, booking_id=body.booking_id, centre_id=body.centre_id)
    )


@router.post("/call-next", response_model=QueueEntryResponse | None)
async def call_next(
    body: CallNextRequest,
    db: AsyncSession = Depends(get_db),
) -> QueueEntry | None:
    await _get_centre(db, body.centre_id)
    entry = await queue_service.call_next(db, body.centre_id)
    return QueueEntryResponse.model_validate(entry) if entry else None


@router.get("/queue/{centre_id}", response_model=QueueSummary)
async def queue_summary(
    centre_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> QueueSummary:
    await _get_centre(db, centre_id)
    waiting = await queue_service.list_waiting(db, centre_id)
    eta = await queue_service.estimate_wait(db, centre_id)
    return QueueSummary(
        centre_id=centre_id,
        waiting=[QueueEntryResponse.model_validate(e) for e in waiting],
        total_waiting=len(waiting),
        estimated_wait_minutes=eta,
    )


@router.post("/queue/{queue_entry_id}/no-show", response_model=QueueEntryResponse)
async def mark_no_show(
    queue_entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> QueueEntry:
    return QueueEntryResponse.model_validate(
        await queue_service.mark_no_show(db, queue_entry_id)
    )


@router.post("/queue/{queue_entry_id}/start", response_model=QueueEntryResponse)
async def start_processing(
    queue_entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> QueueEntry:
    return QueueEntryResponse.model_validate(
        await queue_service.start_processing(db, queue_entry_id)
    )


@router.post("/queue/{queue_entry_id}/complete", response_model=QueueEntryResponse)
async def complete_processing(
    queue_entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> QueueEntry:
    return QueueEntryResponse.model_validate(
        await queue_service.complete_processing(db, queue_entry_id)
    )


@router.post("/procurements", response_model=ProcurementResponse, status_code=201)
async def record_procurement(
    body: ProcurementRecordRequest,
    db: AsyncSession = Depends(get_db),
) -> Procurement:
    procurement = await procurement_service.record(
        db,
        booking_id=body.booking_id,
        accepted_quantity=body.accepted_quantity,
        unit=body.unit,
        quality_notes=body.quality_notes,
    )
    booking = await booking_service.get_by_id(db, procurement.booking_id)
    farmer = await farmer_service.get_by_id(db, booking.farmer_id)
    await notification_service.notify_procurement_completed(db, procurement, booking, farmer)
    return ProcurementResponse.model_validate(procurement)


@router.post("/procurements/{procurement_id}/payment", response_model=PaymentResponse)
async def initiate_payment(
    procurement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Payment:
    procurement = await procurement_service.get_by_id(db, procurement_id)
    payment = await payment_service.create_for_procurement(db, procurement)
    booking = await booking_service.get_by_id(db, procurement.booking_id)
    farmer = await farmer_service.get_by_id(db, booking.farmer_id)
    await notification_service.notify_payment_initiated(db, payment, booking, farmer)
    return PaymentResponse.model_validate(payment)


@router.get("/procurements/{procurement_id}/review")
async def review_payment_info(
    procurement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    procurement = await procurement_service.get_by_id(db, procurement_id)
    return await payment_service.review_payload_for(db, procurement)


@router.post("/payments/{payment_id}/verify", response_model=PaymentResponse)
async def verify_payment(
    payment_id: uuid.UUID,
    body: PaymentReviewRequest,
    db: AsyncSession = Depends(get_db),
) -> Payment:
    payment = await payment_service.review(
        db,
        payment_id,
        confirmed=body.confirmed,
        verified_by=body.verified_by,
    )
    if payment.status == PaymentStatus.CONFIRMED:
        procurement = await procurement_service.get_by_id(db, payment.procurement_id)
        booking = await booking_service.get_by_id(db, procurement.booking_id)
        farmer = await farmer_service.get_by_id(db, booking.farmer_id)
        await notification_service.notify_payment_confirmed(db, payment, booking, farmer)
    return PaymentResponse.model_validate(payment)


@router.get("/events/{entity_type}/{entity_id}", response_model=list[EventResponse])
async def entity_events(
    entity_type: str,
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list:
    return await event_service.list_for_entity(db, entity_type, entity_id)
