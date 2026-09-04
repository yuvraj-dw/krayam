import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.slot import Slot
from app.schemas.procurement import SlotCreate, SlotResponse
from app.services.centre import centre_service
from app.services.slot import slot_service

router = APIRouter(prefix="/slots", tags=["slots"])


@router.post("", response_model=SlotResponse, status_code=201)
async def create_slot(body: SlotCreate, db: AsyncSession = Depends(get_db)) -> Slot:
    await centre_service.get_by_id(db, body.centre_id)
    return SlotResponse.model_validate(await slot_service.create(db, body))


@router.get("", response_model=list[SlotResponse])
async def list_slots(
    centre_id: uuid.UUID = Query(...),
    on_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[Slot]:
    return [
        SlotResponse.model_validate(s)
        for s in await slot_service.list_available(db, centre_id, on_date)
    ]
