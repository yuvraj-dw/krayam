import asyncio
import json
import typing
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.database import async_session_factory
from app.dependencies import (
    get_current_farmer,
    get_current_operator,
    require_same_centre,
)
from app.models.farmer import Farmer
from app.models.operator import Operator
from app.services.bus import bus
from app.services.outbox import outbox_service, serialize_event

router = APIRouter(prefix="/events", tags=["events"])

HEARTBEAT_SECONDS = 15.0


def _frame(row: dict[str, typing.Any]) -> str:
    return (
        f"id: {row['id']}\n"
        f"event: {row['event_type']}\n"
        f"data: {json.dumps(row)}\n\n"
    )


def _last_event_id(request: Request) -> int:
    raw = request.headers.get("Last-Event-ID", "0")
    try:
        value = int(raw)
    except ValueError:
        value = 0
    return value if value > 0 else 0


async def _replay(
    scope_centre_id: uuid.UUID | None,
    scope_farmer_id: uuid.UUID | None,
    after_id: int,
) -> list[dict[str, typing.Any]]:
    async with async_session_factory() as db:
        rows = await outbox_service.pull(
            db,
            centre_id=scope_centre_id,
            farmer_id=scope_farmer_id,
            cursor=after_id,
            limit=500,
        )
        return [serialize_event(row) for row in rows]


async def _event_stream(
    scope_key: str,
    scope_centre_id: uuid.UUID | None,
    scope_farmer_id: uuid.UUID | None,
    after_id: int,
) -> AsyncIterator[str]:
    queue = await bus.subscribe(scope_key)
    try:
        for row in await _replay(scope_centre_id, scope_farmer_id, after_id):
            yield _frame(row)
            if row["id"] > after_id:
                after_id = row["id"]
        while True:
            try:
                row = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue
            yield _frame(row)
    finally:
        await bus.unsubscribe(scope_key, queue)


@router.get("/stream")
async def operator_stream(
    request: Request,
    centre_id: uuid.UUID,
    operator: Operator = Depends(get_current_operator),
) -> StreamingResponse:
    require_same_centre(centre_id, operator.centre_id)
    return StreamingResponse(
        _event_stream(
            f"centre:{operator.centre_id}",
            operator.centre_id,
            None,
            _last_event_id(request),
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/me")
async def farmer_stream(
    request: Request,
    farmer: Farmer = Depends(get_current_farmer),
) -> StreamingResponse:
    return StreamingResponse(
        _event_stream(
            f"farmer:{farmer.id}",
            None,
            farmer.id,
            _last_event_id(request),
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
