import hmac
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_operator, require_same_centre
from app.exceptions import AuthorizationError, ValidationError
from app.models.booking import Booking, BookingStatus
from app.models.operator import Operator
from app.models.payment import PaymentStatus
from app.models.queue import QueueEntry
from app.schemas.analytics import AnalyticsSummary
from app.schemas.operations import (
    CheckInRequest,
    EventResponse,
    OperatorBookingListResponse,
    OperatorDashboardResponse,
    OperatorPaymentListResponse,
    PaymentResponse,
    PaymentReviewRequest,
    ProcurementRecordRequest,
    ProcurementResponse,
    QueueEntryResponse,
    QueueSummary,
)
from app.schemas.operator import (
    OperatorLoginRequest,
    OperatorRegisterRequest,
    OperatorResponse,
    OperatorTokenResponse,
)
from app.services.analytics import analytics_service
from app.services.booking import booking_service
from app.services.event import event_service
from app.services.farmer import farmer_service
from app.services.notification import notification_service
from app.services.operator import operator_service
from app.services.outbox import outbox_service
from app.services.payment import payment_service
from app.services.procurement import procurement_service
from app.services.queue import queue_service

router = APIRouter(prefix="/operator", tags=["operator"])
settings = get_settings()


async def _require_own_booking(
    db: AsyncSession, booking_id: uuid.UUID, operator: Operator
) -> Booking:
    booking = await booking_service.get_by_id(db, booking_id)
    if booking.centre_id != operator.centre_id:
        raise AuthorizationError("Booking is not in your centre")
    return booking


async def _require_own_entry(
    db: AsyncSession, queue_entry_id: uuid.UUID, operator: Operator
) -> QueueEntry:
    entry = await queue_service.get_entry(db, queue_entry_id)
    if entry.centre_id != operator.centre_id:
        raise AuthorizationError("Queue entry is not in your centre")
    return entry


@router.post("/login", response_model=OperatorTokenResponse)
async def operator_login(
    body: OperatorLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> OperatorTokenResponse:
    operator = await operator_service.login(db, phone=body.phone, password=body.password)
    return OperatorTokenResponse(
        access_token=operator_service.token_for(operator),
        operator=OperatorResponse.model_validate(operator),
    )


@router.post("/register", response_model=OperatorResponse, status_code=201)
async def operator_register(
    body: OperatorRegisterRequest,
    x_service_key: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
) -> OperatorResponse:
    if not settings.SUPABASE_SERVICE_KEY:
        raise AuthorizationError("Operator registration is disabled")
    if not hmac.compare_digest(x_service_key, settings.SUPABASE_SERVICE_KEY):
        raise AuthorizationError("Invalid service key")
    op = await operator_service.register(
        db,
        name=body.name,
        phone=body.phone,
        password=body.password,
        centre_id=body.centre_id,
    )
    return OperatorResponse.model_validate(op)


@router.post("/check-in", response_model=QueueEntryResponse)
async def check_in_farmer(
    body: CheckInRequest,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> QueueEntryResponse:
    before = await outbox_service.max_id(db)
    entry = await queue_service.check_in(
        db, booking_id=body.booking_id, centre_id=operator.centre_id
    )
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return QueueEntryResponse.model_validate(entry)


@router.post("/call-next", response_model=QueueEntryResponse | None)
async def call_next(
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> QueueEntryResponse | None:
    before = await outbox_service.max_id(db)
    entry = await queue_service.call_next(db, operator.centre_id)
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return QueueEntryResponse.model_validate(entry) if entry else None


@router.get("/queue/{centre_id}", response_model=QueueSummary)
async def queue_summary(
    centre_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> QueueSummary:
    require_same_centre(centre_id, operator.centre_id)
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
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> QueueEntryResponse:
    await _require_own_entry(db, queue_entry_id, operator)
    before = await outbox_service.max_id(db)
    entry = await queue_service.mark_no_show(db, queue_entry_id)
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return QueueEntryResponse.model_validate(entry)


@router.post("/queue/{queue_entry_id}/start", response_model=QueueEntryResponse)
async def start_processing(
    queue_entry_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> QueueEntryResponse:
    await _require_own_entry(db, queue_entry_id, operator)
    before = await outbox_service.max_id(db)
    entry = await queue_service.start_processing(db, queue_entry_id)
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return QueueEntryResponse.model_validate(entry)


@router.post("/queue/{queue_entry_id}/complete", response_model=QueueEntryResponse)
async def complete_processing(
    queue_entry_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> QueueEntryResponse:
    await _require_own_entry(db, queue_entry_id, operator)
    before = await outbox_service.max_id(db)
    entry = await queue_service.complete_processing(db, queue_entry_id)
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return QueueEntryResponse.model_validate(entry)


@router.post("/procurements", response_model=ProcurementResponse, status_code=201)
async def record_procurement(
    body: ProcurementRecordRequest,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> ProcurementResponse:
    await _require_own_booking(db, body.booking_id, operator)
    before = await outbox_service.max_id(db)
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
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return ProcurementResponse.model_validate(procurement)


@router.post("/procurements/{procurement_id}/payment", response_model=PaymentResponse)
async def initiate_payment(
    procurement_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    procurement = await procurement_service.get_by_id(db, procurement_id)
    await _require_own_booking(db, procurement.booking_id, operator)
    before = await outbox_service.max_id(db)
    payment = await payment_service.create_for_procurement(db, procurement)
    booking = await booking_service.get_by_id(db, procurement.booking_id)
    farmer = await farmer_service.get_by_id(db, booking.farmer_id)
    await notification_service.notify_payment_initiated(db, payment, booking, farmer)
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return PaymentResponse.model_validate(payment)


@router.get("/procurements/{procurement_id}/review")
async def review_payment_info(
    procurement_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> dict:
    procurement = await procurement_service.get_by_id(db, procurement_id)
    await _require_own_booking(db, procurement.booking_id, operator)
    return await payment_service.review_payload_for(db, procurement)


@router.post("/payments/{payment_id}/verify", response_model=PaymentResponse)
async def verify_payment(
    payment_id: uuid.UUID,
    body: PaymentReviewRequest,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    payment = await payment_service.get_by_id(db, payment_id)
    procurement = await procurement_service.get_by_id(db, payment.procurement_id)
    await _require_own_booking(db, procurement.booking_id, operator)
    before = await outbox_service.max_id(db)
    payment = await payment_service.review(
        db,
        payment_id,
        confirmed=body.confirmed,
        verified_by=body.verified_by,
    )
    if payment.status == PaymentStatus.CONFIRMED:
        booking = await booking_service.get_by_id(db, procurement.booking_id)
        farmer = await farmer_service.get_by_id(db, booking.farmer_id)
        await notification_service.notify_payment_confirmed(db, payment, booking, farmer)
    await outbox_service.publish_after(db, centre_id=operator.centre_id, after=before)
    return PaymentResponse.model_validate(payment)


@router.get("/events/{entity_type}/{entity_id}", response_model=list[EventResponse])
async def entity_events(
    entity_type: str,
    entity_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> list[EventResponse]:
    if entity_type == "booking":
        await _require_own_booking(db, entity_id, operator)
    elif entity_type == "queue_entry":
        await _require_own_entry(db, entity_id, operator)
    elif entity_type == "procurement":
        proc = await procurement_service.get_by_id(db, entity_id)
        await _require_own_booking(db, proc.booking_id, operator)
    elif entity_type == "payment":
        pmt = await payment_service.get_by_id(db, entity_id)
        proc = await procurement_service.get_by_id(db, pmt.procurement_id)
        await _require_own_booking(db, proc.booking_id, operator)
    else:
        raise ValidationError(f"Unsupported entity type: {entity_type}")
    events = await event_service.list_for_entity(db, entity_type, entity_id)
    return [EventResponse.model_validate(e) for e in events]


@router.get("/bookings", response_model=OperatorBookingListResponse)
async def list_operator_bookings(
    search: str | None = Query(
        default=None, description="Search farmer name/phone/ID or booking ID"
    ),
    date: date_type | None = Query(
        default=None, alias="date", description="Filter by expected date"
    ),
    crop: str | None = Query(default=None),
    status: BookingStatus | None = Query(default=None),
    slot_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> OperatorBookingListResponse:
    items, total = await booking_service.search_for_centre(
        db,
        operator.centre_id,
        search=search,
        on_date=date,
        crop=crop,
        status=status,
        slot_id=slot_id,
        limit=limit,
        offset=offset,
    )
    return OperatorBookingListResponse(
        items=items,  # type: ignore[arg-type]
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/dashboard", response_model=OperatorDashboardResponse)
async def get_operator_dashboard(
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> OperatorDashboardResponse:
    data = await operator_service.get_dashboard_summary(db, operator.centre_id)
    return OperatorDashboardResponse(**data)


@router.get("/payments", response_model=OperatorPaymentListResponse)
async def list_operator_payments(
    status: PaymentStatus | None = Query(default=None),
    has_anomaly: bool | None = Query(default=None),
    from_date: date_type | None = Query(default=None),
    to_date: date_type | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    operator: Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
) -> OperatorPaymentListResponse:
    if from_date and to_date and from_date > to_date:
        raise ValidationError("from_date must be before or equal to to_date")
    items, total = await payment_service.list_for_centre(
        db,
        operator.centre_id,
        status=status,
        has_anomaly=has_anomaly,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )
    return OperatorPaymentListResponse(
        items=items,  # type: ignore[arg-type]
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/analytics", response_model=AnalyticsSummary)
async def get_operator_analytics(
    from_date: date_type | None = Query(default=None, alias="from", description="Start date (defaults to today)"),
    to_date: date_type | None = Query(default=None, alias="to", description="End date (defaults to today)"),
    db: AsyncSession = Depends(get_db),
    operator: Operator = Depends(get_current_operator),
) -> AnalyticsSummary:
    today = date_type.today()
    start_date = from_date or today
    end_date = to_date or today

    if start_date > end_date:
        raise ValidationError("from must be on or before to")

    return await analytics_service.summary(
        db, centre_id=operator.centre_id, from_date=start_date, to_date=end_date
    )
