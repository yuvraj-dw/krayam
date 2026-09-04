import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ConflictError, NotFoundError
from app.models.farmer import Farmer
from app.schemas.farmer import FarmerRegisterRequest, FarmerUpdateRequest
from app.services.location import location_service
from app.utils.phone import normalize_phone


def generate_farmer_id() -> str:
    """Generate a farmer display ID like FARM-00042."""
    return f"FARM-{uuid.uuid4().hex[:5].upper()}"


class FarmerService:
    async def register(self, db: AsyncSession, phone: str, data: FarmerRegisterRequest) -> Farmer:
        """Register a new farmer."""
        normalized = normalize_phone(phone)

        # Check if already registered
        existing = await db.execute(select(Farmer).where(Farmer.phone == normalized))
        if existing.scalar_one_or_none():
            raise ConflictError("A farmer with this phone number already exists")

        # Resolve location if pincode/village provided
        latitude = data.latitude
        longitude = data.longitude
        district = data.district
        state = data.state

        if (not latitude or not longitude) and (data.pincode or data.village):
            resolved = await location_service.resolve(
                pincode=data.pincode,
                village=data.village,
                district=data.district,
                state=data.state,
            )
            if resolved:
                latitude = resolved.latitude
                longitude = resolved.longitude
                district = district or resolved.district
                state = state or resolved.state

        farmer = Farmer(
            phone=normalized,
            name=data.name,
            village=data.village,
            district=district,
            state=state,
            pincode=data.pincode,
            latitude=latitude,
            longitude=longitude,
            farmer_id=generate_farmer_id(),
            is_verified=True,
        )
        db.add(farmer)
        await db.flush()
        await db.refresh(farmer)
        return farmer

    async def get_by_id(self, db: AsyncSession, farmer_id: uuid.UUID) -> Farmer:
        """Get a farmer by ID."""
        result = await db.execute(select(Farmer).where(Farmer.id == farmer_id))
        farmer = result.scalar_one_or_none()
        if not farmer:
            raise NotFoundError("Farmer not found")
        return farmer

    async def get_by_phone(self, db: AsyncSession, phone: str) -> Farmer | None:
        """Get a farmer by phone number."""
        normalized = normalize_phone(phone)
        result = await db.execute(select(Farmer).where(Farmer.phone == normalized))
        return result.scalar_one_or_none()

    async def update(self, db: AsyncSession, farmer: Farmer, data: FarmerUpdateRequest) -> Farmer:
        """Update farmer profile."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(farmer, field, value)

        # Re-resolve location if pincode/village changed
        if "pincode" in update_data or "village" in update_data:
            resolved = await location_service.resolve(
                pincode=farmer.pincode,
                village=farmer.village,
                district=farmer.district,
                state=farmer.state,
            )
            if resolved and not farmer.latitude:
                farmer.latitude = resolved.latitude
                farmer.longitude = resolved.longitude

        await db.flush()
        await db.refresh(farmer)
        return farmer


farmer_service = FarmerService()
