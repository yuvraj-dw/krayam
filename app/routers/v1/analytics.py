import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import NotFoundError, ValidationError
from app.models.centre import Centre
from app.schemas.analytics import AnalyticsForecast, AnalyticsSummary
from app.services.analytics import analytics_service
from app.services.centre import centre_service
from app.services.forecast import forecast_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def _get_centre(db: AsyncSession, centre_id: uuid.UUID) -> Centre:
    centre = await centre_service.get_by_id(db, centre_id)
    if not centre:
        raise NotFoundError("Centre not found")
    return centre


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    centre_id: uuid.UUID,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummary:
    await _get_centre(db, centre_id)
    if from_date > to_date:
        raise ValidationError("from must be on or before to")
    return await analytics_service.summary(
        db, centre_id=centre_id, from_date=from_date, to_date=to_date
    )


@router.get("/forecast", response_model=AnalyticsForecast)
async def analytics_forecast(
    centre_id: uuid.UUID,
    target: date | None = Query(default=None, alias="date"),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsForecast:
    await _get_centre(db, centre_id)
    target_date = target or datetime.now(timezone.utc).date()
    return await forecast_service.forecast_for_date(
        db, centre_id=centre_id, target_date=target_date
    )
