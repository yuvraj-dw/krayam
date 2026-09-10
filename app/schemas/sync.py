import typing
from datetime import date, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.events import OutboxEventResponse
from app.schemas.operations import QueueEntryResponse
from app.schemas.procurement import BookingResponse


class SyncCentreInfo(BaseModel):
    id: UUID
    name: str
    code: str
    address: str | None = None
    operating_start: time | None = None
    operating_end: time | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class SyncCropInfo(BaseModel):
    id: UUID
    crop_name: str
    rate_per_unit: float | None = None
    unit: str
    is_active: bool

    model_config = {"from_attributes": True}


class SyncSlotInfo(BaseModel):
    id: UUID
    date: date
    start_time: time
    end_time: time
    max_bookings: int
    current_bookings: int
    is_available: bool

    model_config = {"from_attributes": True}


class SyncSnapshotResponse(BaseModel):
    centre: SyncCentreInfo
    crops: list[SyncCropInfo]
    slots: list[SyncSlotInfo]
    bookings: list[BookingResponse]
    waitlist: list[QueueEntryResponse]


class SyncEventIn(BaseModel):
    client_event_id: UUID
    type: str
    expected_current_state: dict[str, typing.Any] = Field(default_factory=dict)
    payload: dict[str, typing.Any] = Field(default_factory=dict)


class SyncBatchRequest(BaseModel):
    events: list[SyncEventIn]


class SyncEventResult(BaseModel):
    client_event_id: UUID
    status: Literal["accepted", "duplicate", "conflicting", "rejected"]
    error: str | None = None
    server_current_state: dict[str, typing.Any] | None = None


class SyncBatchResponse(BaseModel):
    results: list[SyncEventResult]


class SyncPullResponse(BaseModel):
    events: list[OutboxEventResponse]
    next_cursor: int
    has_more: bool
