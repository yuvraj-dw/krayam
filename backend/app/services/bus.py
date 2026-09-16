import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[Any]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, scope_key: str) -> asyncio.Queue[Any]:
        queue: asyncio.Queue[Any] = asyncio.Queue(maxsize=2000)
        async with self._lock:
            self._subscribers.setdefault(scope_key, []).append(queue)
        return queue

    async def unsubscribe(self, scope_key: str, queue: asyncio.Queue[Any]) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(scope_key)
            if not subscribers:
                return
            try:
                subscribers.remove(queue)
            except ValueError:
                return
            if not subscribers:
                self._subscribers.pop(scope_key, None)

    def publish(self, scope_keys: list[str], payload: dict[str, Any]) -> None:
        if not scope_keys:
            return
        for key in scope_keys:
            for queue in list(self._subscribers.get(key, [])):
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    logger.debug(
                        "Bus queue full for %s; dropping row (replay covers it)",
                        key,
                    )

    async def close(self) -> None:
        async with self._lock:
            self._subscribers.clear()


bus = EventBus()
