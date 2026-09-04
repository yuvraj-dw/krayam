import pytest
from sqlalchemy import text

from app.database import engine


@pytest.fixture(autouse=True)
async def clean_sms_tables():
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE sms_messages, sms_sessions RESTART IDENTITY CASCADE"))
    yield


@pytest.mark.anyio
async def test_sms_webhook_help(client):
    response = await client.post(
        "/sms/incoming",
        json={
            "message": "HELP",
            "sender": "9876543210",
            "messageId": "test-001",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
