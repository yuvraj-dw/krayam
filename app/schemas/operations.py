from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.payment import PaymentStatus
from app.models.queue import QueueStatus


class CheckInRequest(BaseModel):
    booking_id: UUID
    centre_id: UUID


class CallNextRequest(BaseModel):
    centre_id: UUID


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
