from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.exceptions import AuthenticationError, AuthorizationError
from app.models.farmer import Farmer
from app.models.operator import Operator
from app.schemas.auth import TokenData

settings = get_settings()
security = HTTPBearer()


async def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """Decodes JWT and returns user_id, role, and optional centre_id.
    Accepts valid farmer or operator tokens.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        role = payload.get("role")
        if role not in ("farmer", "operator"):
            raise AuthenticationError("Invalid role in token")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise AuthenticationError("Invalid token subject")
        user_id = UUID(str(user_id_str))

        centre_id = None
        if role == "operator":
            centre_id_raw = payload.get("centre_id")
            if not centre_id_raw:
                raise AuthenticationError("Invalid operator token: missing centre_id")
            centre_id = UUID(str(centre_id_raw))

        return TokenData(user_id=user_id, role=role, centre_id=centre_id)
    except (JWTError, ValueError, TypeError) as e:
        raise AuthenticationError("Invalid token") from e


async def get_current_farmer(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Farmer:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("role") != "farmer":
            raise AuthenticationError("Farmer token expected")
        farmer_id: str | None = payload.get("sub")
        if farmer_id is None:
            raise AuthenticationError("Invalid token")
        farmer_uuid = UUID(str(farmer_id))
    except (JWTError, ValueError, TypeError) as e:
        raise AuthenticationError("Invalid token") from e

    result = await db.execute(select(Farmer).where(Farmer.id == farmer_uuid))
    farmer = result.scalar_one_or_none()
    if farmer is None or not farmer.is_active:
        raise AuthenticationError("Farmer not found or inactive")
    return farmer


async def get_pending_phone(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Resolve the phone number from a pending-registration token.

    auth.verify_otp issues a ``pending:<phone>`` subject when no farmer
    profile exists yet, telling the client to call /auth/register. That
    endpoint depends on this rather than get_current_farmer, which expects a
    real farmer UUID in the token subject.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        sub = payload.get("sub")
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {e}") from e
    if not isinstance(sub, str) or not sub.startswith("pending:"):
        raise AuthenticationError("Registration requires a pending-verification token")
    return sub.split(":", 1)[1]


async def get_current_operator(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Operator:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("role") != "operator":
            raise AuthenticationError("Operator token expected")
        operator_id = payload.get("sub")
        if operator_id is None or payload.get("centre_id") is None:
            raise AuthenticationError("Invalid operator token")
        operator_uuid = UUID(str(operator_id))
    except (JWTError, ValueError, TypeError) as e:
        raise AuthenticationError("Invalid operator token") from e

    result = await db.execute(select(Operator).where(Operator.id == operator_uuid))
    operator = result.scalar_one_or_none()
    if operator is None or not operator.is_active:
        raise AuthenticationError("Operator not found or inactive")
    return operator


def require_same_centre(given: UUID, operator_centre_id: UUID) -> None:
    if given != operator_centre_id:
        raise AuthorizationError("Centre does not match the operator's centre")
