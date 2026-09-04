from pydantic import BaseModel


class ResolvedLocation(BaseModel):
    latitude: float
    longitude: float
    district: str | None = None
    state: str | None = None
    village: str | None = None
    source: str  # "pincode", "nominatim", "district_centroid"
