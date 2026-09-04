import logging
import random
import string
from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.exceptions import RateLimitError, ValidationError
from app.models.farmer import OTP, Farmer, OTPPurpose
from app.services.sms_gate import sms_gate_client
from app.utils.phone import normalize_phone

logger = logging.getLogger(__name__)
settings = get_settings()


class OTPService:
    def generate_code(self) -> str:
        """Generate a random numeric OTP code."""
        return "".join(random.choices(string.digits, k=settings.OTP_LENGTH))

    async def send_otp(self, db: AsyncSession, phone: str, purpose: OTPPurpose) -> None:
        """Generate and send an OTP to the given phone number."""
        normalized = normalize_phone(phone)

        # Check rate limit: cooldown between resends
        recent_otp = await db.execute(
            select(OTP)
            .where(
                and_(
                    OTP.phone == normalized,
                    OTP.purpose == purpose,
                    OTP.created_at
                    >= datetime.now(timezone.utc)
                    - timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS),
                )
            )
            .order_by(OTP.created_at.desc())
            .limit(1)
        )
        recent = recent_otp.scalar_one_or_none()
        if recent:
            raise RateLimitError(
                f"Please wait {settings.OTP_RESEND_COOLDOWN_SECONDS}s before requesting a new OTP"
            )

        code = self.generate_code()
        otp = OTP(
            phone=normalized,
            code=code,
            purpose=purpose,
            max_attempts=settings.OTP_MAX_ATTEMPTS,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
        )
        db.add(otp)
        await db.flush()

        # Send via SMS Gate
        await sms_gate_client.send_sms(
            to=normalized,
            message=(
                f"Your verification code is: {code}. "
                f"Valid for {settings.OTP_EXPIRY_MINUTES} minutes."
            ),
        )
        logger.info("OTP sent to %s for purpose=%s", normalized, purpose.value)

    async def verify_otp(
        self, db: AsyncSession, phone: str, code: str, purpose: OTPPurpose
    ) -> bool:
        """Verify an OTP code. Returns True if valid."""
        normalized = normalize_phone(phone)

        result = await db.execute(
            select(OTP)
            .where(
                and_(
                    OTP.phone == normalized,
                    OTP.purpose == purpose,
                    OTP.is_used == False,  # noqa: E712
                )
            )
            .order_by(OTP.created_at.desc())
            .limit(1)
        )
        otp = result.scalar_one_or_none()

        if not otp:
            raise ValidationError("No valid OTP found. Please request a new one.")

        if otp.expires_at < datetime.now(timezone.utc):
            raise ValidationError("OTP has expired. Please request a new one.")

        if otp.attempts >= otp.max_attempts:
            raise ValidationError(
                "Maximum verification attempts exceeded. Please request a new OTP."
            )

        otp.attempts += 1

        if otp.code != code:
            await db.flush()
            raise ValidationError(f"Invalid OTP. {otp.max_attempts - otp.attempts} attempts left.")

        otp.is_used = True
        await db.flush()
        return True


class AuthService:
    def create_access_token(self, farmer_id: str, role: str = "farmer") -> str:
        """Create a JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {"sub": farmer_id, "role": role, "exp": expire}
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    async def get_or_create_farmer(self, db: AsyncSession, phone: str) -> tuple[Farmer, bool]:
        """Get existing farmer or return None. Returns (farmer, is_new)."""
        normalized = normalize_phone(phone)
        result = await db.execute(select(Farmer).where(Farmer.phone == normalized))
        farmer = result.scalar_one_or_none()
        if farmer:
            return farmer, False
        return None, True  # type: ignore[return-value]


otp_service = OTPService()
auth_service = AuthService()
