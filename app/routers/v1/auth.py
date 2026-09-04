from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_farmer
from app.exceptions import ValidationError
from app.models.farmer import Farmer, OTPPurpose
from app.schemas.auth import OTPSendRequest, OTPVerifyRequest, TokenResponse
from app.schemas.common import SuccessResponse
from app.schemas.farmer import FarmerRegisterRequest, FarmerResponse
from app.services.auth import auth_service, otp_service
from app.services.farmer import farmer_service
from app.utils.phone import normalize_phone, validate_phone

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/send", response_model=SuccessResponse)
async def send_otp(body: OTPSendRequest, db: AsyncSession = Depends(get_db)) -> SuccessResponse:
    if not validate_phone(body.phone):
        raise ValidationError("Invalid phone number. Enter a 10-digit Indian mobile number.")

    normalized = normalize_phone(body.phone)
    existing = await db.execute(select(Farmer).where(Farmer.phone == normalized))
    farmer = existing.scalar_one_or_none()

    purpose = OTPPurpose.LOGIN if farmer else OTPPurpose.REGISTER
    await otp_service.send_otp(db, normalized, purpose)
    return SuccessResponse(message="OTP sent successfully")


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    normalized = normalize_phone(body.phone)

    # Determine purpose based on whether farmer exists
    existing = await db.execute(select(Farmer).where(Farmer.phone == normalized))
    farmer = existing.scalar_one_or_none()
    purpose = OTPPurpose.LOGIN if farmer else OTPPurpose.REGISTER

    await otp_service.verify_otp(db, normalized, body.code, purpose)

    if farmer:
        token = auth_service.create_access_token(str(farmer.id))
        return TokenResponse(
            access_token=token,
            farmer_id=str(farmer.id),
            is_registered=True,
        )
    else:
        # Phone verified but not registered yet — return token without farmer_id
        # The frontend should call /auth/register next
        token = auth_service.create_access_token(f"pending:{normalized}")
        return TokenResponse(
            access_token=token,
            is_registered=False,
        )


@router.post("/register", response_model=FarmerResponse)
async def register_farmer(
    body: FarmerRegisterRequest,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> FarmerResponse:
    """Register farmer profile after OTP verification."""
    registered = await farmer_service.register(db, farmer.phone, body)
    return FarmerResponse.model_validate(registered)
