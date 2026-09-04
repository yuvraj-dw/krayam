import pytest


@pytest.mark.anyio
async def test_send_otp_invalid_phone(client):
    response = await client.post(
        "/api/v1/auth/otp/send",
        json={"phone": "123"},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_verify_otp_no_session(client):
    response = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "9876543210", "code": "000000"},
    )
    assert response.status_code in (400, 422, 401)
