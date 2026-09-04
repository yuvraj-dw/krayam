from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel

from app.models.booking import BookingStatus


class CentreCreate(BaseModel):
    name: str
    code: str
    address: str | None = None
    village: str | None = None
    district: str | None = None
    state: str | None = None
    latitude: float
    longitude: float
    capacity: int = 50
    operating_start: time = time(9, 0)
    operating_end: time = time(17, 0)
    is_active: bool = True


class CentreUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    village: str | None = None
    district: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    capacity: int | None = None
    operating_start: time | None = None
    operating_end: time | None = None
    is_active: bool | None = None


class CentreCropCreate(BaseModel):
    crop_name: str
    rate_per_unit: float | None = None
    unit: str = "quintal"
    is_active: bool = True


class CentreCropResponse(BaseModel):
    id: UUID
    crop_name: str
    rate_per_unit: float | None = None
    unit: str
    is_active: bool

    model_config = {"from_attributes": True}


class CentreResponse(BaseModel):
    id: UUID
    name: str
    code: str
    address: str | None = None
    village: str | None = None
    district: str | None = None
    state: str | None = None
    latitude: float
    longitude: float
    capacity: int
    operating_start: time
    operating_end: time
    is_active: bool
    crops: list[CentreCropResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class RecommendedCentre(BaseModel):
    centre: CentreResponse
    distance_km: float | None = None
    accepted: bool
    current_queue: int = 0
    est_wait_units: int = 0
    load_percent: float = 0
    has_slots: bool = False
    score: float = 0
    reasons: list[str] = []


class SlotCreate(BaseModel):
    centre_id: UUID
    date: date
    start_time: time
    end_time: time
    max_bookings: int = 10


class SlotResponse(BaseModel):
    id: UUID
    centre_id: UUID
    date: date
    start_time: time
    end_time: time
    max_bookings: int
    current_bookings: int
    is_available: bool

    model_config = {"from_attributes": True}


class BookingCreate(BaseModel):
    crop: str
    quantity: float
    unit: str = "quintal"
    expected_date: date
    centre_id: UUID | None = None
    slot_id: UUID | None = None


class BookingReschedule(BaseModel):
    expected_date: date | None = None
    centre_id: UUID | None = None
    slot_id: UUID | None = None


class BookingResponse(BaseModel):
    id: UUID
    booking_id: str
    farmer_id: UUID
    centre_id: UUID | None = None
    slot_id: UUID | None = None
    crop: str
    quantity: float
    unit: str
    expected_date: date
    status: BookingStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
