from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus
from app.models.payment import PaymentStatus
from app.models.queue import QueueStatus


class CheckInRequest(BaseModel):
    booking_id: UUID


class QueueEntryResponse(BaseModel):
    id: UUID
    booking_id: UUID
    centre_id: UUID
    position: int
    status: QueueStatus
    checked_in_at: datetime | None = None
    called_at: datetime | None = None

    model_config = {"from_attributes": True}


class QueueSummary(BaseModel):
    centre_id: UUID
    waiting: list[QueueEntryResponse]
    total_waiting: int
    current_position: int | None = None
    estimated_wait_minutes: int | None = None


class ProcurementRecordRequest(BaseModel):
    booking_id: UUID
    accepted_quantity: float
    unit: str = "quintal"
    quality_notes: str | None = None


class ProcurementResponse(BaseModel):
    id: UUID
    procurement_id: str
    booking_id: UUID
    accepted_quantity: float
    unit: str
    quality_notes: str | None = None
    processing_start: datetime | None = None
    processing_end: datetime | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentReviewRequest(BaseModel):
    confirmed: bool
    verified_by: str | None = None


class PaymentResponse(BaseModel):
    id: UUID
    payment_id: str
    procurement_id: UUID
    farmer_id: UUID
    quantity: float
    rate: float
    amount: float
    status: PaymentStatus
    verified_by: str | None = None
    verified_at: datetime | None = None
    confirmed_at: datetime | None = None
    created_at: datetime
    anomaly_flags: list[str] = []

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    id: UUID
    event_type: str
    entity_type: str
    entity_id: UUID | None = None
    actor_id: UUID | None = None
    actor_type: str | None = None
    data: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OperatorBookingItem(BaseModel):
    id: UUID
    booking_id: str
    farmer_id: UUID
    farmer_name: str
    farmer_phone: str
    farmer_code: str
    centre_id: UUID
    slot_id: UUID | None
    crop: str
    quantity: float
    unit: str
    expected_date: date
    status: BookingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class OperatorBookingListResponse(BaseModel):
    items: list[OperatorBookingItem]
    total: int
    limit: int
    offset: int


class QueueOverview(BaseModel):
    waiting_count: int
    called_count: int
    processing_count: int
    estimated_wait_minutes: int


class ProcurementOverview(BaseModel):
    completed_today_count: int
    total_tonnage_today: float


class PaymentOverview(BaseModel):
    pending_count: int
    pending_amount: float
    flagged_count: int


class CapacityOverview(BaseModel):
    daily_capacity: int
    utilization_percent: float


class SyncOverview(BaseModel):
    max_outbox_id: int


class OperatorDashboardResponse(BaseModel):
    centre_id: UUID
    today: date
    bookings_today_total: int
    queue: QueueOverview
    procurement: ProcurementOverview
    payments: PaymentOverview
    capacity: CapacityOverview
    sync: SyncOverview


class OperatorPaymentItem(BaseModel):
    id: UUID
    payment_id: str
    procurement_id: UUID
    booking_id: UUID
    farmer_id: UUID
    farmer_name: str
    farmer_phone: str
    quantity: float
    rate: float
    amount: float
    status: PaymentStatus
    anomaly_flags: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class OperatorPaymentListResponse(BaseModel):
    items: list[OperatorPaymentItem]
    total: int
    limit: int
    offset: int

