import pytest


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
