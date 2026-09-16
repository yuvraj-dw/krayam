from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class OutboxEventResponse(BaseModel):
    id: int
    centre_id: UUID | None = None
    farmer_id: UUID | None = None
    event_type: str
    entity_type: str
    entity_id: UUID | None = None
    data: dict | None = None
    actor_type: str | None = None
    actor_id: UUID | None = None
    client_event_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
