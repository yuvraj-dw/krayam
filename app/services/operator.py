import hashlib
import hmac
import os
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AuthenticationError, ConflictError, ValidationError
from app.models.operator import Operator
from app.services.auth import auth_service
from app.services.centre import centre_service
from app.utils.phone import normalize_phone, validate_phone

PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (ValueError, TypeError):
        return False
    computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
    return hmac.compare_digest(computed, expected)


class OperatorService:
    async def register(
        self,
        db: AsyncSession,
        *,
        name: str,
        phone: str,
        password: str,
        centre_id: uuid.UUID,
    ) -> Operator:
        if not validate_phone(phone):
            raise ValidationError("Invalid phone number. Enter a 10-digit Indian mobile number.")
        normalized = normalize_phone(phone)
        await centre_service.get_by_id(db, centre_id)
        existing = await db.execute(select(Operator).where(Operator.phone == normalized))
        if existing.scalar_one_or_none():
            raise ConflictError("An operator with this phone already exists")
        operator = Operator(
            name=name.strip(),
            phone=normalized,
            password_hash=hash_password(password),
            centre_id=centre_id,
        )
        db.add(operator)
        await db.flush()
        await db.refresh(operator)
        return operator

    async def login(
        self, db: AsyncSession, *, phone: str, password: str
    ) -> Operator:
        normalized = normalize_phone(phone)
        result = await db.execute(select(Operator).where(Operator.phone == normalized))
        operator = result.scalar_one_or_none()
        if not operator or not verify_password(password, operator.password_hash):
            raise AuthenticationError("Invalid phone or password")
        if not operator.is_active:
            raise AuthenticationError("Operator account is inactive")
        return operator

    def token_for(self, operator: Operator) -> str:
        return auth_service.create_access_token(
            str(operator.id),
            role="operator",
            claims={"centre_id": str(operator.centre_id)},
        )


operator_service = OperatorService()
