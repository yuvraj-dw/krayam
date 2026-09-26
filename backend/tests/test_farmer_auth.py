import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.auth import auth_service
from app.utils.security import verify_password


@pytest_asyncio.fixture(autouse=True, loop_scope="function")
async def cleanup():
    async with async_session_factory() as db:
        await db.execute(
            text(
                "DELETE FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone IN ('9479669839', '9479669838', '9479669837', '9479669830', '9479669831', '9479669832'))"
            )
        )
        await db.execute(
            text(
                "DELETE FROM farmers WHERE phone IN ('9479669839', '9479669838', '9479669837', '9479669830', '9479669831', '9479669832')"
            )
        )
        await db.commit()
    yield
    async with async_session_factory() as db:
        await db.execute(
            text(
                "DELETE FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone IN ('9479669839', '9479669838', '9479669837', '9479669830', '9479669831', '9479669832'))"
            )
        )
        await db.execute(
            text(
                "DELETE FROM farmers WHERE phone IN ('9479669839', '9479669838', '9479669837', '9479669830', '9479669831', '9479669832')"
            )
        )
        await db.commit()
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="function")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(loop_scope="function")
async def db_session():
    async with async_session_factory() as session:
        yield session


@pytest.mark.asyncio(loop_scope="function")
async def test_farmer_register_with_password(client: AsyncClient, db_session):
    phone = "+919479669839"
    pending_token = auth_service.create_access_token(f"pending:{phone}")

    payload = {
        "name": "Kailash Patil",
        "password": "SecurePassword123",
        "village": "Lasalgaon",
        "district": "Nashik",
        "state": "Maharashtra",
        "pincode": "422306",
    }
    response = await client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {pending_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Kailash Patil"
    assert data["phone"] in (phone, "9479669839")

    # Verify password was hashed and saved in DB
    result = await db_session.execute(
        text("SELECT password_hash FROM farmers WHERE phone = '9479669839'")
    )
    row = result.first()
    assert row is not None
    assert row[0] is not None
    assert verify_password("SecurePassword123", row[0]) is True


@pytest.mark.asyncio(loop_scope="function")
async def test_farmer_register_fails_without_password(client: AsyncClient):
    phone = "+919479669838"
    pending_token = auth_service.create_access_token(f"pending:{phone}")

    payload = {
        "name": "No Password Farmer",
        "village": "Khanna",
    }
    response = await client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {pending_token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio(loop_scope="function")
async def test_farmer_register_fails_with_short_password(client: AsyncClient):
    phone = "+919479669837"
    pending_token = auth_service.create_access_token(f"pending:{phone}")

    payload = {
        "name": "Short Password Farmer",
        "password": "123",
    }
    response = await client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {pending_token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_farmer_login_with_valid_password(client: AsyncClient, db_session):
    phone = "+919479669830"
    pending_token = auth_service.create_access_token(f"pending:{phone}")

    # Register
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Login Farmer", "password": "Password999"},
        headers={"Authorization": f"Bearer {pending_token}"},
    )

    # Login with correct password
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "Password999"},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["is_registered"] is True
    assert data["farmer_id"] is not None


@pytest.mark.asyncio
async def test_farmer_login_with_invalid_password(client: AsyncClient, db_session):
    phone = "+919479669831"
    pending_token = auth_service.create_access_token(f"pending:{phone}")
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Login Farmer 2", "password": "Password999"},
        headers={"Authorization": f"Bearer {pending_token}"},
    )

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "WrongPassword"},
    )
    assert login_resp.status_code == 401
    detail = login_resp.json().get("detail") or login_resp.json().get("error", {}).get("message", "")
    assert "Invalid phone or password" in detail


@pytest.mark.asyncio
async def test_farmer_login_nonexistent_phone(client: AsyncClient):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": "+919999999999", "password": "Password999"},
    )
    assert login_resp.status_code == 401


@pytest.mark.asyncio
async def test_farmer_login_without_password_set(client: AsyncClient, db_session):
    from app.services.farmer import farmer_service
    farmer, _ = await farmer_service.register_walk_in(
        db_session,
        name="Walkin Only",
        phone="+919479669832",
    )
    await db_session.commit()

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": "+919479669832", "password": "SomePassword"},
    )
    assert login_resp.status_code == 401
    detail = login_resp.json().get("detail") or login_resp.json().get("error", {}).get("message", "")
    assert "No password set" in detail


@pytest.mark.asyncio
async def test_farmer_login_neither_password_nor_code(client: AsyncClient):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": "+919479669833"},
    )
    assert login_resp.status_code in (400, 422)

