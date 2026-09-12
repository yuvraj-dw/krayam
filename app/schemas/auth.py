from uuid import UUID

from pydantic import BaseModel


class TokenData(BaseModel):
    user_id: UUID
    role: str
    centre_id: UUID | None = None


class OTPSendRequest(BaseModel):
    phone: str


class OTPVerifyRequest(BaseModel):
    phone: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    farmer_id: str | None = None
    is_registered: bool = False
