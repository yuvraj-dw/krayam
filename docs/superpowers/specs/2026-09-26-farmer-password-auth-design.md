# Technical Design: Farmer Password & Dual Login Flow

## 1. Overview
This design adds password support to farmer accounts in Krayam backend, allowing farmers to register with both OTP and password, while permitting subsequent logins via either password or OTP.

## 2. Requirements & Scope
- **Scope**: Backend only (`backend/app/`). Frontend is intentionally out of scope.
- **Registration**: Strictly requires both mobile OTP verification and password creation.
- **Login**: Supports authentication either via password or via OTP.
- **Backward Compatibility**: Existing seeded farmers and walk-ins without passwords must remain functional.

## 3. Data Model & Database Migration
- **Table**: `farmers`
- **Field Added**:
  ```python
  password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
  ```
- **Migration**: Alembic migration `backend/alembic/versions/006_farmer_password.py` adding nullable `password_hash` column to `farmers`.
- **Password Hashing**: PBKDF2-HMAC-SHA256 (`100,000` iterations, 16-byte random salt, constant-time `hmac.compare_digest`), centralized in `backend/app/utils/security.py`.

## 4. API Endpoints & Request Schemas

### 4.1. Registration Flow
1. **Request OTP**: `POST /api/v1/auth/otp/send` with `{ "phone": "+919479669839" }`.
2. **Verify OTP**: `POST /api/v1/auth/otp/verify` with `{ "phone": "+919479669839", "code": "123456" }`.
   - Returns short-lived JWT token with subject `pending:+919479669839`.
3. **Register Profile**: `POST /api/v1/auth/register` with `Authorization: Bearer <pending_token>`.
   - Request schema `FarmerRegisterRequest`:
     ```python
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
   - Validates pending token, hashes password, saves `Farmer` record, returns `FarmerResponse`.

### 4.2. Login Flow
1. **Password Login**: `POST /api/v1/auth/login`
   - Request schema `FarmerLoginRequest`:
     ```python
     class FarmerLoginRequest(BaseModel):
         phone: str
         password: str | None = None
         code: str | None = None
     ```
   - When `password` is provided:
     - Normalizes phone and looks up `Farmer`.
     - Validates password against `farmer.password_hash`.
     - Issues JWT access token `TokenResponse(access_token=..., farmer_id=..., is_registered=True)`.
   - When `code` is provided (unified login convenience):
     - Validates OTP code using `otp_service.verify_otp`.
     - Issues JWT access token.
   - If neither or invalid: raises 400/401 error.
2. **OTP Login**: `POST /api/v1/auth/otp/verify` continues to work for existing clients.

## 5. Security & Edge Case Handling
- **Missing Password**: Registration payload without `password` returns `422 Unprocessable Entity`.
- **Invalid Password**: Failed password check returns `401 Unauthorized` with `"Invalid phone or password"`.
- **Unset Password**: Attempting password login on an account with `password_hash = None` returns `401 Unauthorized` with `"No password set for this account. Please log in with OTP."`.
- **Inactive Accounts**: Checked for `is_active == True`; returns `403 Forbidden` if deactivated.
- **Walk-in Farmers**: Operator walk-in creation (`register_walk_in`) leaves `password_hash` as `None`.

## 6. Verification Plan
- Unit and integration tests in `backend/tests/test_farmer_auth.py`:
  1. Two-step registration with OTP + password.
  2. Registration rejection when password is missing or shorter than 6 characters.
  3. Registration rejection without valid pending OTP token.
  4. Successful login via `POST /api/v1/auth/login` using password.
  5. Failed login via `POST /api/v1/auth/login` using wrong password.
  6. Login on legacy farmer without password directing to OTP.
  7. Backward compatibility check for `POST /api/v1/auth/otp/verify`.
