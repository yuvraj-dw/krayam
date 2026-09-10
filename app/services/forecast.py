import math
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError
from app.models.booking import Booking, BookingStatus
from app.models.centre import Centre
from app.models.queue import QueueEntry
from app.schemas.analytics import AnalyticsForecast
from app.services.queue import ACTIVE_COUNTERS, AVG_PROCESS_MINUTES

ACTIVE_FORECAST_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)
HISTORY_WINDOW_DAYS = 28
HIGH_LOAD_PERCENT = 80.0
LOCAL_TZ = "Asia/Kolkata"


def _local_ts(column: Any) -> Any:
    return column.op("AT TIME ZONE")(LOCAL_TZ)


def _pg_dow(value: date) -> int:
    """Postgres dow: Sunday=0 .. Saturday=6."""
    return (value.weekday() + 1) % 7


class ForecastService:
    async def forecast_for_date(
        self,
        db: AsyncSession,
        *,
        centre_id: uuid.UUID,
        target_date: date,
    ) -> AnalyticsForecast:
        forecasts = await self._compute(db, [centre_id], target_date)
        if centre_id not in forecasts:
            raise NotFoundError("Centre not found")
        return forecasts[centre_id]

    async def expected_loads(
        self,
        db: AsyncSession,
        *,
        centre_ids: list[uuid.UUID],
        target_date: date,
    ) -> dict[uuid.UUID, float]:
        forecasts = await self._compute(db, centre_ids, target_date)
        return {cid: f.expected_load_percent for cid, f in forecasts.items()}

    async def _compute(
        self,
        db: AsyncSession,
        centre_ids: list[uuid.UUID],
        target_date: date,
    ) -> dict[uuid.UUID, AnalyticsForecast]:
        ids = list(dict.fromkeys(centre_ids))
        if not ids:
            return {}
        centre_rows = (
            await db.execute(select(Centre).where(Centre.id.in_(ids)))
        ).scalars().all()
        if not centre_rows:
            return {}
        capacity_by_id = {c.id: c.capacity for c in centre_rows}

        active = await self._active_bookings(db, ids, target_date)
        historical = await self._historical_arrivals(db, ids, target_date)

        forecasts: dict[uuid.UUID, AnalyticsForecast] = {}
        for centre_id, capacity in capacity_by_id.items():
            active_count, booked_qty = active.get(centre_id, (0, 0.0))
            hist_avg = historical.get(centre_id, 0.0)
            expected = round(min(float(active_count) + hist_avg, float(capacity)), 1)
            load = round(expected / capacity * 100.0, 1) if capacity else 0.0
            warnings: list[str] = []
            if load >= HIGH_LOAD_PERCENT:
                warnings.append("high_load")
            if expected >= capacity:
                warnings.append("over_capacity")
            forecasts[centre_id] = AnalyticsForecast(
                centre_id=centre_id,
                date=target_date,
                capacity=capacity,
                active_bookings=active_count,
                booked_quantity=round(booked_qty, 2),
                historical_avg_arrivals=hist_avg,
                expected_arrivals=expected,
                expected_load_percent=load,
                predicted_wait_minutes=math.ceil(expected / ACTIVE_COUNTERS)
                * AVG_PROCESS_MINUTES,
                warnings=warnings,
            )
        return forecasts

    async def _active_bookings(
        self,
        db: AsyncSession,
        ids: list[uuid.UUID],
        target_date: date,
    ) -> dict[uuid.UUID, tuple[int, float]]:
        rows = (
            await db.execute(
                select(
                    Booking.centre_id,
                    func.count(Booking.id),
                    func.coalesce(func.sum(Booking.quantity), 0.0),
                )
                .where(
                    Booking.centre_id.in_(ids),
                    Booking.expected_date == target_date,
                    Booking.status.in_(ACTIVE_FORECAST_STATUSES),
                )
                .group_by(Booking.centre_id)
            )
        ).all()
        return {cid: (int(count), float(sum_)) for cid, count, sum_ in rows}

    async def _historical_arrivals(
        self,
        db: AsyncSession,
        ids: list[uuid.UUID],
        target_date: date,
    ) -> dict[uuid.UUID, float]:
        window_end = target_date - timedelta(days=1)
        window_start = target_date - timedelta(days=HISTORY_WINDOW_DAYS)
        start_dt = datetime.combine(window_start, time.min, tzinfo=timezone.utc)
        end_dt = datetime.combine(window_end, time.max, tzinfo=timezone.utc)
        dow = _pg_dow(target_date)
        rows = (
            await db.execute(
                select(QueueEntry.centre_id, func.count(QueueEntry.id))
                .where(
                    QueueEntry.centre_id.in_(ids),
                    QueueEntry.checked_in_at.is_not(None),
                    QueueEntry.checked_in_at.between(start_dt, end_dt),
                    func.extract("dow", _local_ts(QueueEntry.checked_in_at)) == dow,
                )
                .group_by(QueueEntry.centre_id)
            )
        ).all()
        occurrences = sum(
            1
            for i in range(HISTORY_WINDOW_DAYS)
            if (window_end - timedelta(days=i)).weekday() == target_date.weekday()
        )
        if not occurrences:
            return {}
        return {cid: round(count / occurrences, 1) for cid, count in rows}


forecast_service = ForecastService()
