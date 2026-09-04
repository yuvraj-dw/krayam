from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FarmerRegisterRequest(BaseModel):
    name: str
    village: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class FarmerUpdateRequest(BaseModel):
    name: str | None = None
    village: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class FarmerResponse(BaseModel):
    id: UUID
    phone: str
    name: str
    village: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    farmer_id: str | None = None
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
