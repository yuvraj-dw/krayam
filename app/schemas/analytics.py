from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    centre_id: UUID
    from_date: date_type
    to_date: date_type
    farmers_served: int
    total_quantity_procured: float
    avg_waiting_minutes: float | None = None
    avg_processing_minutes: float | None = None
    no_shows: int = 0
    cancellations: int = 0
    pending_payments_count: int = 0
    pending_payments_amount: float = 0.0
    completed_payments_count: int = 0
    completed_payments_amount: float = 0.0
    arrivals_by_hour: dict[int, int] = Field(default_factory=dict)
    peak_hour: int | None = None


class AnalyticsForecast(BaseModel):
    centre_id: UUID
    date: date_type
    capacity: int
    active_bookings: int = 0
    booked_quantity: float = 0.0
    historical_avg_arrivals: float = 0.0
    expected_arrivals: float = 0.0
    expected_load_percent: float = 0.0
    predicted_wait_minutes: int = 0
    warnings: list[str] = Field(default_factory=list)
