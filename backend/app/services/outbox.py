import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import OutboxEvent
from app.services.bus import bus


def scope_keys(row: OutboxEvent) -> list[str]:
    keys: list[str] = []
    if row.centre_id:
        keys.append(f"centre:{row.centre_id}")
    if row.farmer_id:
        keys.append(f"farmer:{row.farmer_id}")
    return keys


def serialize_event(row: OutboxEvent) -> dict[str, Any]:
    return {
        "id": row.id,
        "centre_id": str(row.centre_id) if row.centre_id else None,
        "farmer_id": str(row.farmer_id) if row.farmer_id else None,
        "event_type": row.event_type,
        "entity_type": row.entity_type,
        "entity_id": str(row.entity_id) if row.entity_id else None,
        "data": row.data or {},
        "actor_type": row.actor_type,
        "actor_id": str(row.actor_id) if row.actor_id else None,
        "client_event_id": str(row.client_event_id) if row.client_event_id else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


class OutboxService:
    async def emit(
        self,
        db: AsyncSession,
        *,
        event_type: str,
        entity_type: str,
        entity_id: uuid.UUID | None = None,
        data: dict[str, Any] | None = None,
        centre_id: uuid.UUID | None = None,
        farmer_id: uuid.UUID | None = None,
        actor_type: str | None = None,
        actor_id: uuid.UUID | None = None,
        client_event_id: uuid.UUID | None = None,
    ) -> OutboxEvent:
        row = OutboxEvent(
            centre_id=centre_id,
            farmer_id=farmer_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            data=data or {},
            actor_type=actor_type,
            actor_id=actor_id,
            client_event_id=client_event_id,
        )
        db.add(row)
        await db.flush()
        await db.refresh(row)
        return row

    async def pull(
        self,
        db: AsyncSession,
        *,
        centre_id: uuid.UUID | None = None,
        farmer_id: uuid.UUID | None = None,
        cursor: int = 0,
        limit: int = 500,
    ) -> list[OutboxEvent]:
        query = (
            select(OutboxEvent)
            .where(OutboxEvent.id > cursor)
            .order_by(OutboxEvent.id.asc())
            .limit(limit)
        )
        if centre_id is not None:
            query = query.where(OutboxEvent.centre_id == centre_id)
        if farmer_id is not None:
            query = query.where(OutboxEvent.farmer_id == farmer_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def max_id(self, db: AsyncSession) -> int:
        value = await db.scalar(select(func.max(OutboxEvent.id)))
        return int(value or 0)

    async def publish_after(
        self,
        db: AsyncSession,
        *,
        centre_id: uuid.UUID | None = None,
        farmer_id: uuid.UUID | None = None,
        after: int = 0,
        limit: int = 200,
    ) -> None:
        rows = await self.pull(
            db, centre_id=centre_id, farmer_id=farmer_id,
            cursor=after, limit=limit,
        )
        for row in rows:
            bus.publish(scope_keys(row), serialize_event(row))


outbox_service = OutboxService()
