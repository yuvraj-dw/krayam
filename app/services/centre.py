import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import ConflictError, NotFoundError
from app.models.centre import Centre, CentreCrop
from app.schemas.procurement import CentreCreate, CentreCropCreate, CentreUpdate


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two coordinates in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class CentreService:
    async def create(self, db: AsyncSession, data: CentreCreate) -> Centre:
        existing = await db.execute(select(Centre).where(Centre.code == data.code))
        if existing.scalar_one_or_none():
            raise ConflictError(f"A centre with code {data.code!r} already exists")
        centre = Centre(**data.model_dump())
        db.add(centre)
        await db.flush()
        await db.refresh(centre)
        return centre

    async def get_by_id(self, db: AsyncSession, centre_id: uuid.UUID) -> Centre:
        result = await db.execute(
            select(Centre)
            .where(Centre.id == centre_id)
            .options(selectinload(Centre.crops))
        )
        centre = result.scalar_one_or_none()
        if not centre:
            raise NotFoundError("Centre not found")
        return centre

    async def get_by_code(self, db: AsyncSession, code: str) -> Centre | None:
        result = await db.execute(
            select(Centre).where(Centre.code == code).options(selectinload(Centre.crops))
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        db: AsyncSession,
        *,
        crop: str | None = None,
        active_only: bool = True,
    ) -> list[Centre]:
        query = select(Centre).options(selectinload(Centre.crops))
        if active_only:
            query = query.where(Centre.is_active.is_(True))
        if crop:
            query = (
                query.join(CentreCrop, CentreCrop.centre_id == Centre.id)
                .where(CentreCrop.crop_name == crop, CentreCrop.is_active.is_(True))
                .distinct()
            )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def update(self, db: AsyncSession, centre: Centre, data: CentreUpdate) -> Centre:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(centre, field, value)
        await db.flush()
        await db.refresh(centre)
        return centre

    async def add_crop(
        self, db: AsyncSession, centre_id: uuid.UUID, data: CentreCropCreate
    ) -> CentreCrop:
        existing = await db.execute(
            select(CentreCrop).where(
                CentreCrop.centre_id == centre_id, CentreCrop.crop_name == data.crop_name
            )
        )
        crop = existing.scalar_one_or_none()
        if crop:
            if crop.is_active:
                raise ConflictError(f"Centre already accepts {data.crop_name!r}")
            crop.is_active = True
            crop.rate_per_unit = data.rate_per_unit
            crop.unit = data.unit
            await db.flush()
            await db.refresh(crop)
            return crop
        crop = CentreCrop(centre_id=centre_id, **data.model_dump())
        db.add(crop)
        await db.flush()
        await db.refresh(crop)
        return crop


centre_service = CentreService()
