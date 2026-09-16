import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_farmer
from app.models.farmer import Farmer
from app.schemas.farmer import FarmerResponse, FarmerUpdateRequest
from app.schemas.notification import NotificationItem, NotificationListResponse
from app.services.farmer import farmer_service
from app.services.notification import notification_service

router = APIRouter(prefix="/farmers", tags=["farmers"])


@router.get("/me", response_model=FarmerResponse)
async def get_my_profile(
    farmer: Farmer = Depends(get_current_farmer),
) -> FarmerResponse:
    return FarmerResponse.model_validate(farmer)


@router.put("/me", response_model=FarmerResponse)
async def update_my_profile(
    body: FarmerUpdateRequest,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> FarmerResponse:
    updated = await farmer_service.update(db, farmer, body)
    return FarmerResponse.model_validate(updated)


@router.get("/me/notifications", response_model=NotificationListResponse)
async def list_my_notifications(
    is_read: bool | None = Query(default=None, description="Filter by read status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    items, total, unread_count = await notification_service.list_for_farmer(
        db, farmer.id, is_read=is_read, limit=limit, offset=offset
    )
    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
        limit=limit,
        offset=offset,
    )


@router.patch("/me/notifications/{notification_id}/read", response_model=NotificationItem)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> NotificationItem:
    item = await notification_service.mark_as_read(db, notification_id, farmer.id)
    return NotificationItem.model_validate(item)


@router.post("/me/notifications/read-all")
async def mark_all_notifications_as_read(
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    updated = await notification_service.mark_all_as_read(db, farmer.id)
    return {"updated": updated}

