from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.exceptions import AuthenticationError
from app.models.farmer import Farmer

settings = get_settings()
security = HTTPBearer()


async def get_current_farmer(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Farmer:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        farmer_id: str | None = payload.get("sub")
        if farmer_id is None:
            raise AuthenticationError("Invalid token")
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {e}") from e

    result = await db.execute(select(Farmer).where(Farmer.id == farmer_id))
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
