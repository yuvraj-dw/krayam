# Farmer Password & Dual Login Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable farmers to register with both OTP and password, and log in with either password or OTP.

**Architecture:** Add a nullable `password_hash` column to the `Farmer` model in PostgreSQL, centralize PBKDF2-HMAC-SHA256 password hashing in `backend/app/utils/security.py`, require `password` in `FarmerRegisterRequest` during profile registration, and implement `POST /api/v1/auth/login` to authenticate farmers by phone and password (with fallback support for OTP).

**Tech Stack:** Python 3.10, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, PyJWT/python-jose, pytest.

## Global Constraints
- Backend only (`backend/app/`). Do not touch `frontend/`.
- Maintain full backwards compatibility for existing seeded farmers and physical walk-in registrations (who have `password_hash = None`).
- Use PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt.
- Test commands run via `pytest backend/tests -v`.

---

### Task 1: Password Security Utilities

**Files:**
- Create: `backend/app/utils/security.py`
- Modify: `backend/app/services/operator.py:26-43`
- Test: `backend/tests/test_security_utils.py`

**Interfaces:**
- Produces:
  ```python
  def hash_password(password: str) -> str: ...
  def verify_password(password: str, stored: str) -> bool: ...
  ```

- [ ] **Step 1: Write test for password hashing and verification**

Create `backend/tests/test_security_utils.py`:
```python
from app.utils.security import hash_password, verify_password


def test_hash_password_produces_valid_format():
    hashed = hash_password("MySecurePass123")
    assert hashed.startswith("pbkdf2_sha256$100000$")
    parts = hashed.split("$")
    assert len(parts) == 4
    assert len(parts[2]) == 32  # 16-byte hex salt


def test_verify_password_correct():
    password = "FarmerSecret@2026"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_password_incorrect():
    hashed = hash_password("FarmerSecret@2026")
    assert verify_password("WrongPassword", hashed) is False


def test_verify_password_corrupted_hash():
    assert verify_password("password", "invalid_hash_string") is False
    assert verify_password("password", "") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -3.10 -m pytest backend/tests/test_security_utils.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.utils.security'`

- [ ] **Step 3: Implement `backend/app/utils/security.py` and refactor `operator.py` to use it**

Create `backend/app/utils/security.py`:
```python
import hashlib
import hmac
import os

PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (ValueError, TypeError):
        return False
    computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
    return hmac.compare_digest(computed, expected)
```

In `backend/app/services/operator.py`:
Replace inline `hash_password` and `verify_password` definitions with import:
```python
from app.utils.security import hash_password, verify_password
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -3.10 -m pytest backend/tests/test_security_utils.py backend/tests/test_operator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/security.py backend/app/services/operator.py backend/tests/test_security_utils.py
git commit -m "feat(auth): centralize password hashing and verification utils"
```

---

### Task 2: Farmer Model & Database Migration

**Files:**
- Modify: `backend/app/models/farmer.py:24-27`
- Create: `backend/alembic/versions/006_farmer_password.py`
- Test: `backend/tests/test_farmer_model.py`

**Interfaces:**
- Produces: `Farmer.password_hash` column on `farmers` table.

- [ ] **Step 1: Write test for `Farmer.password_hash` attribute**

Create `backend/tests/test_farmer_model.py`:
```python
from app.models.farmer import Farmer


def test_farmer_model_has_password_hash():
    farmer = Farmer(
        phone="+919479669839",
        name="Ramesh Kumar",
        password_hash="pbkdf2_sha256$100000$test$test",
    )
    assert farmer.password_hash == "pbkdf2_sha256$100000$test$test"


def test_farmer_model_allows_null_password_hash():
    farmer = Farmer(
        phone="+919479669839",
        name="Walkin Farmer",
        password_hash=None,
    )
    assert farmer.password_hash is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -3.10 -m pytest backend/tests/test_farmer_model.py -v`
Expected: FAIL with `TypeError: 'password_hash' is an invalid keyword argument for Farmer`

- [ ] **Step 3: Update `backend/app/models/farmer.py` and create Alembic migration `006_farmer_password.py`**

In `backend/app/models/farmer.py`, add `password_hash` after line 24:
```python
    farmer_id: Mapped[str | None] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
```

Create `backend/alembic/versions/006_farmer_password.py`:
```python
"""Add password_hash to farmers table

Revision ID: 006
Revises: 005
Create Date: 2026-09-26
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("farmers", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("farmers", "password_hash")
```

- [ ] **Step 4: Run migration and tests**

Run:
```bash
py -3.10 -m alembic upgrade head
py -3.10 -m pytest backend/tests/test_farmer_model.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/farmer.py backend/alembic/versions/006_farmer_password.py backend/tests/test_farmer_model.py
git commit -m "feat(db): add password_hash column to farmers table"
```

---

### Task 3: Enforce Password on Farmer Registration

**Files:**
- Modify: `backend/app/schemas/farmer.py:7-15`
- Modify: `backend/app/services/farmer.py:82-110`
- Test: `backend/tests/test_farmer_auth.py`

**Interfaces:**
- Consumes: `hash_password` from `app.utils.security`
- Modifies: `FarmerRegisterRequest(name: str, password: str, ...)`

- [ ] **Step 1: Write tests for registration with password in `backend/tests/test_farmer_auth.py`**

Create `backend/tests/test_farmer_auth.py`:
```python
import pytest
from httpx import AsyncClient
from app.services.auth import auth_service
from app.utils.security import verify_password


@pytest.mark.asyncio
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
    assert data["phone"] == phone


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -3.10 -m pytest backend/tests/test_farmer_auth.py -v`
Expected: FAIL (missing password validation / unhandled field)

- [ ] **Step 3: Update `FarmerRegisterRequest` schema and `FarmerService.register`**

In `backend/app/schemas/farmer.py`:
```python
from pydantic import BaseModel, Field


class FarmerRegisterRequest(BaseModel):
    name: str
    password: str = Field(min_length=6, max_length=128)
    village: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
```

In `backend/app/services/farmer.py`:
Import `hash_password`:
```python
from app.utils.security import hash_password
```
Update `register` method in `FarmerService` to save `password_hash`:
```python
        farmer = Farmer(
            phone=normalized,
            name=data.name.strip(),
            password_hash=hash_password(data.password),
            village=data.village.strip() if data.village else None,
            district=data.district.strip() if data.district else None,
            state=data.state.strip() if data.state else None,
            pincode=data.pincode.strip() if data.pincode else None,
            latitude=latitude,
            longitude=longitude,
            farmer_id=generate_farmer_id(),
            is_verified=True,
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.10 -m pytest backend/tests/test_farmer_auth.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/farmer.py backend/app/services/farmer.py backend/tests/test_farmer_auth.py
git commit -m "feat(auth): require password in farmer registration request"
```

---

### Task 4: Farmer Password Login Endpoint (`POST /api/v1/auth/login`)

**Files:**
- Modify: `backend/app/schemas/auth.py`
- Modify: `backend/app/routers/v1/auth.py`
- Test: `backend/tests/test_farmer_auth.py`

**Interfaces:**
- Produces: `POST /api/v1/auth/login` accepting `FarmerLoginRequest(phone: str, password: str | None = None, code: str | None = None)` returning `TokenResponse`.

- [ ] **Step 1: Write tests for `POST /api/v1/auth/login`**

Append to `backend/tests/test_farmer_auth.py`:
```python
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
    assert "Invalid phone or password" in login_resp.json()["detail"]


@pytest.mark.asyncio
async def test_farmer_login_nonexistent_phone(client: AsyncClient):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": "+919999999999", "password": "Password999"},
    )
    assert login_resp.status_code == 401


@pytest.mark.asyncio
async def test_farmer_login_without_password_set(client: AsyncClient, db_session):
    # Walk-in farmer has password_hash=None
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
    assert "No password set" in login_resp.json()["detail"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -3.10 -m pytest backend/tests/test_farmer_auth.py -k "test_farmer_login" -v`
Expected: FAIL with `404 Not Found` for `/api/v1/auth/login`.

- [ ] **Step 3: Define `FarmerLoginRequest` and implement route in `backend/app/routers/v1/auth.py`**

In `backend/app/schemas/auth.py`:
```python
class FarmerLoginRequest(BaseModel):
    phone: str
    password: str | None = None
    code: str | None = None
```

In `backend/app/routers/v1/auth.py`:
Import `AuthenticationError` from `app.exceptions`, `verify_password` from `app.utils.security`, and `FarmerLoginRequest`.
Add the endpoint:
```python
@router.post("/login", response_model=TokenResponse)
async def login_farmer(
    body: FarmerLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if not validate_phone(body.phone):
        raise ValidationError("Invalid phone number. Enter a 10-digit Indian mobile number.")

    normalized = normalize_phone(body.phone)
    result = await db.execute(select(Farmer).where(Farmer.phone == normalized))
    farmer = result.scalar_one_or_none()

    if not body.password and not body.code:
        raise ValidationError("Either password or OTP code must be provided.")

    if body.password:
        if not farmer:
            raise AuthenticationError("Invalid phone or password")
        if not farmer.is_active:
            raise AuthorizationError("Farmer account is deactivated")
        if not farmer.password_hash:
            raise AuthenticationError("No password set for this account. Please log in with OTP.")
        if not verify_password(body.password, farmer.password_hash):
            raise AuthenticationError("Invalid phone or password")

        token = auth_service.create_access_token(str(farmer.id))
        return TokenResponse(
            access_token=token,
            farmer_id=str(farmer.id),
            is_registered=True,
        )

    # If code is provided, use OTP verification
    await otp_service.verify_otp(db, normalized, body.code, OTPPurpose.LOGIN if farmer else OTPPurpose.REGISTER)
    if farmer:
        token = auth_service.create_access_token(str(farmer.id))
        return TokenResponse(
            access_token=token,
            farmer_id=str(farmer.id),
            is_registered=True,
        )
    token = auth_service.create_access_token(f"pending:{normalized}")
    return TokenResponse(
        access_token=token,
        is_registered=False,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.10 -m pytest backend/tests/test_farmer_auth.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/routers/v1/auth.py backend/tests/test_farmer_auth.py
git commit -m "feat(auth): add POST /api/v1/auth/login supporting password and OTP login"
```

---

### Task 5: Existing Test Suite Regression Verification & Update

**Files:**
- Modify: `backend/tests/` (any existing tests invoking `/auth/register` needing the new password field)
- Test: Full backend test suite

- [ ] **Step 1: Check existing tests for `/auth/register` calls**

Grep for `/auth/register` across `backend/tests`:
Update test payloads where `/auth/register` is invoked to provide a valid `password: "password123"`.

- [ ] **Step 2: Run all backend tests**

Run: `py -3.10 -m pytest backend/tests -v`
Expected: ALL PASS with 0 failures.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/
git commit -m "test: ensure all test suites pass with farmer password field"
```
