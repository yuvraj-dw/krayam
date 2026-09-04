import pytest
from httpx import ASGITransport, AsyncClient

from app.database import engine
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def dispose_engine():
    """Dispose the async engine inside the running loop to avoid
    'Event loop is closed' errors from asyncpg during teardown."""
    yield
    await engine.dispose()
