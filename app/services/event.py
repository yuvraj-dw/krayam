import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event


class EventService:
    async def record(
        self,
        db: AsyncSession,
        *,
        event_type: str,
        entity_type: str,
        entity_id: uuid.UUID | None = None,
        actor_id: uuid.UUID | None = None,
        actor_type: str | None = None,
        data: dict | None = None,
    ) -> Event:
        event = Event(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            actor_type=actor_type,
            data=data or {},
        )
        db.add(event)
        await db.flush()
        return event

    async def list_for_entity(
        self, db: AsyncSession, entity_type: str, entity_id: uuid.UUID
    ) -> list[Event]:
        from sqlalchemy import select

        result = await db.execute(
            select(Event)
            .where(Event.entity_type == entity_type, Event.entity_id == entity_id)
            .order_by(Event.created_at.desc())
        )
        return list(result.scalars().all())


event_service = EventService()
