import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import NotFoundError
from app.models.centre import Centre
from app.schemas.common import SuccessResponse
from app.schemas.procurement import (
    CentreCreate,
    CentreCropCreate,
    CentreCropResponse,
    CentreResponse,
    CentreUpdate,
)
from app.services.centre import centre_service

router = APIRouter(prefix="/centres", tags=["centres"])


@router.post("", response_model=CentreResponse, status_code=201)
async def create_centre(body: CentreCreate, db: AsyncSession = Depends(get_db)) -> Centre:
    return CentreResponse.model_validate(await centre_service.create(db, body))


@router.get("", response_model=list[CentreResponse])
async def list_centres(
    crop: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[Centre]:
    return [CentreResponse.model_validate(c) for c in await centre_service.list(db, crop=crop)]


@router.get("/{centre_id}", response_model=CentreResponse)
async def get_centre(centre_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Centre:
    return CentreResponse.model_validate(await centre_service.get_by_id(db, centre_id))


@router.patch("/{centre_id}", response_model=CentreResponse)
async def update_centre(
    centre_id: uuid.UUID, body: CentreUpdate, db: AsyncSession = Depends(get_db)
) -> Centre:
    centre = await centre_service.get_by_id(db, centre_id)
    return CentreResponse.model_validate(await centre_service.update(db, centre, body))


@router.post("/{centre_id}/crops", response_model=CentreCropResponse, status_code=201)
async def add_crop(
    centre_id: uuid.UUID, body: CentreCropCreate, db: AsyncSession = Depends(get_db)
):
    return CentreCropResponse.model_validate(await centre_service.add_crop(db, centre_id, body))


@router.delete("/{centre_id}", response_model=SuccessResponse)
async def delete_centre(centre_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    centre = await centre_service.get_by_id(db, centre_id)
    if not centre.is_active:
        raise NotFoundError("Centre not found")
    centre.is_active = False
    await db.flush()
    return SuccessResponse(message="Centre deactivated")
