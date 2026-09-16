from uuid import UUID

from pydantic import BaseModel, Field


class OperatorRegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str
    password: str = Field(min_length=8, max_length=128)
    centre_id: UUID


class OperatorLoginRequest(BaseModel):
    phone: str
    password: str


class OperatorResponse(BaseModel):
    id: UUID
    name: str
    phone: str
    centre_id: UUID
    is_active: bool

    model_config = {"from_attributes": True}


class OperatorTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    operator: OperatorResponse
