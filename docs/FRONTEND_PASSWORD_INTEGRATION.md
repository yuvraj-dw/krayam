# Frontend Integration Guide: Farmer Password & Dual Login

This document explains how to update the frontend application to support the new **Farmer Password System** in Krayam.

---

## 1. Overview of Changes

1. **Registration Flow (Both Required)**:
   - The farmer must verify their phone number via **OTP** first.
   - When submitting their profile registration details, a **password** is now **mandatory** (minimum 6 characters, maximum 128 characters).
2. **Login Flow (Either Password OR OTP)**:
   - Farmers can log in using **Mobile Number + Password**.
   - Farmers can still log in using **Mobile Number + OTP** (backward compatible).
3. **New API Endpoint**:
   - `POST /api/v1/auth/login` (supports password login and OTP login).

---

## 2. API Specifications

### Base URL
- **Production**: `https://hizru.me/api/v1`
- **Local Dev**: `http://localhost:8000/api/v1`

---

### A. Registration Flow (OTP + Password)

#### Step 1: Request OTP
Send an OTP to the farmer's mobile number.

- **Endpoint**: `POST /api/v1/auth/otp/send`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "phone": "+919479669839"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "message": "OTP sent successfully"
  }
  ```

#### Step 2: Verify OTP
Verify the 6-digit code received via SMS.

- **Endpoint**: `POST /api/v1/auth/otp/verify`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "phone": "+919479669839",
    "code": "123456"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
    "token_type": "bearer",
    "farmer_id": null,
    "is_registered": false
  }
  ```
  > **Note**: Save `access_token` temporarily as the **registration session token** (scoped to `pending:+919479669839`).

#### Step 3: Complete Profile & Set Password
Submit the farmer's profile including the chosen password using the `access_token` from Step 2.

- **Endpoint**: `POST /api/v1/auth/register`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <access_token>`
- **Request Body**:
  ```json
  {
    "name": "Ramesh Kumar",
    "password": "MySecurePassword123",
    "village": "Lasalgaon",
    "district": "Nashik",
    "state": "Maharashtra",
    "pincode": "422306",
    "latitude": 20.1479,
    "longitude": 74.2272
  }
  ```
  *Field Requirements:*
  - `name`: String (Required)
  - `password`: String (Required, **6 to 128 characters**)
  - `village`, `district`, `state`, `pincode`: String (Optional)
  - `latitude`, `longitude`: Float (Optional)
- **Response (`200 OK`)**:
  ```json
  {
    "id": "c1f7a012-68b3-4f91-8be2-3f114c0a18ab",
    "farmer_id": "FARM-7A9B2",
    "phone": "+919479669839",
    "name": "Ramesh Kumar",
    "village": "Lasalgaon",
    "district": "Nashik",
    "state": "Maharashtra",
    "pincode": "422306",
    "latitude": 20.1479,
    "longitude": 74.2272,
    "is_verified": true,
    "created_at": "2026-09-26T12:00:00Z"
  }
  ```

---

### B. Login Flow (Password Login)

Farmers enter their phone number and password to log in directly without waiting for SMS OTP.

- **Endpoint**: `POST /api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "phone": "+919479669839",
    "password": "MySecurePassword123"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "farmer_id": "c1f7a012-68b3-4f91-8be2-3f114c0a18ab",
    "is_registered": true
  }
  ```
  > Store `access_token` in `localStorage` under `krayam_auth_token` for authenticated requests.

#### Error Responses for Password Login:
- **Wrong Password or Unknown Phone (`401 Unauthorized`)**:
  ```json
  {
    "error": {
      "code": "AUTH_ERROR",
      "message": "Invalid phone or password"
    }
  }
  ```
- **Account Has No Password Set (e.g., Legacy / Walk-in farmer) (`401 Unauthorized`)**:
  ```json
  {
    "error": {
      "code": "AUTH_ERROR",
      "message": "No password set for this account. Please log in with OTP."
    }
  }
  ```
- **Deactivated Account (`403 Forbidden`)**:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Farmer account is deactivated"
    }
  }
  ```

---

### C. Login Flow (OTP Login)

Farmers can still log in using standard OTP if they forgot their password or prefer SMS.

- **Step 1**: Call `POST /api/v1/auth/otp/send` with `{ "phone": "+919479669839" }`.
- **Step 2**: Either call:
  - `POST /api/v1/auth/login` with `{ "phone": "+919479669839", "code": "123456" }`
  - OR `POST /api/v1/auth/otp/verify` with `{ "phone": "+919479669839", "code": "123456" }`
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGci...",
    "token_type": "bearer",
    "farmer_id": "c1f7a012-68b3-4f91-8be2-3f114c0a18ab",
    "is_registered": true
  }
  ```

---

## 3. Frontend Code Changes Guide

### 1. Update `frontend/src/services/api.ts`

Add `loginWithPassword` and update `register` to accept `password`:

```typescript
// in api.auth:

// 1. Password login method
loginWithPassword: async (phone: string, password: string): Promise<{
  token: string;
  farmerId: string | null;
  isRegistered: boolean;
}> => {
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+') && cleanPhone.length === 10) {
    cleanPhone = `+91${cleanPhone}`;
  }

  const data = await this.request<{
    access_token: string;
    token_type: string;
    farmer_id: string | null;
    is_registered: boolean;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: cleanPhone, password }),
  });

  this.setToken(data.access_token);
  return {
    token: data.access_token,
    farmerId: data.farmer_id,
    isRegistered: data.is_registered,
  };
},

// 2. Updated registration method to include password
register: async (farmerData: {
  name: string;
  password: string; // <-- Added password field
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}): Promise<FarmerProfile> => {
  const backendFarmer = await this.request<BackendFarmer>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(farmerData),
  });
  return this.transformFarmer(backendFarmer);
},
```

---

### 2. Update `frontend/src/context/AppContext.tsx`

Update the `login` and `register` functions in `AppContext`:

```typescript
// 1. Update farmer register
const register = async (data: {
  fullName: string;
  password: string; // <-- add password
  mobileNumber: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
  coordinates?: { lat: number; lng: number };
}): Promise<FarmerProfile> => {
  setIsAuthLoading(true);
  try {
    const backendFarmer = await api.auth.register({
      name: data.fullName,
      password: data.password, // <-- send to backend
      village: data.village,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      latitude: data.coordinates?.lat,
      longitude: data.coordinates?.lng,
    });
    setFarmer(backendFarmer);
    setIsLoggedIn(true);
    return backendFarmer;
  } finally {
    setIsAuthLoading(false);
  }
};

// 2. Update farmer login to handle password or OTP
const loginFarmerWithPassword = async (phone: string, password: string): Promise<boolean> => {
  setIsAuthLoading(true);
  try {
    const res = await api.auth.loginWithPassword(phone, password);
    if (res.token && res.isRegistered) {
      const me = await api.auth.getMe();
      if (me) setFarmer(me);
      setIsLoggedIn(true);
      return true;
    }
    return false;
  } finally {
    setIsAuthLoading(false);
  }
};
```

---

### 3. Update `frontend/src/components/auth/AuthPage.tsx` UI

#### A. Registration Form
Add a Password Input field in the Farmer Registration card:

```tsx
<div className="space-y-1">
  <label className="text-xs font-semibold text-gray-700">Set Account Password *</label>
  <div className="relative">
    <input
      type={showPassword ? "text" : "password"}
      value={farmerRegPassword}
      onChange={(e) => setFarmerRegPassword(e.target.value)}
      placeholder="At least 6 characters"
      className="w-full px-3 py-2 border rounded-md pr-10 text-sm focus:ring-emerald-500"
      required
      minLength={6}
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
</div>
```

#### B. Login Form
Allow farmers to choose between **"Password"** and **"OTP"**:

- If **Password Login**:
  - Show `Mobile Number` input.
  - Show `Password` input with show/hide toggle.
  - Submit calls `POST /api/v1/auth/login` with `{ phone, password }`.
  - Add text link: *"Login with SMS OTP instead"* to switch tabs.
- If **OTP Login**:
  - Existing flow: Request OTP $\rightarrow$ Enter 6-digit OTP $\rightarrow$ Submit.
  - Add text link: *"Login with Password instead"*.

---

## 4. Testing Checklist for Frontend Developer

- [ ] **Registration with Password**: Verify OTP with new number $\rightarrow$ enter profile with password $\rightarrow$ account is created successfully.
- [ ] **Registration Rejection (< 6 chars)**: Enter 4-character password $\rightarrow$ verify UI and backend 422 validation.
- [ ] **Password Login**: Log in with phone and valid password $\rightarrow$ successfully navigates to Farmer Dashboard.
- [ ] **Wrong Password**: Enter invalid password $\rightarrow$ shows `"Invalid phone or password"`.
- [ ] **OTP Login**: Log in with phone and valid OTP $\rightarrow$ successfully navigates to Farmer Dashboard.
- [ ] **Legacy / Walk-In Farmer Password Warning**: Attempting password login on account without a set password shows `"No password set for this account. Please log in with OTP."`.
