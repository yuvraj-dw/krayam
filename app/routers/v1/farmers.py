from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_farmer
from app.models.farmer import Farmer
from app.schemas.farmer import FarmerResponse, FarmerUpdateRequest
from app.services.farmer import farmer_service

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
