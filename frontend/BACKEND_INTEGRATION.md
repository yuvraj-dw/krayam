# KRAYAM Agri-Procurement — FastAPI Backend Integration Guide

This document specifies the FastAPI REST endpoints, data models, and payload contracts matching `features.md` for seamless integration with the KRAYAM Web & Mobile Frontends.

---

## 1. System Architecture

```
Farmer Web App (React + TS + Vite) ──┐
Farmer Mobile App (React Native / Flutter) ─┼──► FastAPI Backend (Port 8000) ──► PostgreSQL / AI Services
Centre Operator Web App ─────────────┘
                                                      │
SMS Gateway (Twilio / NIC SMS Gateway) ───────────────┘
```

---

## 2. Environment Configuration

In `.env` or production deployment:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

The frontend client (`src/services/api.ts`) automatically sends JWT tokens via:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 3. Required FastAPI Endpoints

### 3.1 Authentication & Registration (`/api/auth`)

#### `POST /api/auth/login`
- **Description**: Authenticate via Farmer ID or Mobile OTP
- **Request Body**:
```json
{
  "identifier": "MP-2024-7842",
  "otp": "123456"
}
```
- **Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "farmer": {
    "farmerId": "MP-2024-7842",
    "fullName": "Sardar Gurpreet Singh",
    "mobileNumber": "+91 98765 43210",
    "location": {
      "village": "Rampur Kalan",
      "tehsil": "Samrala",
      "district": "Ludhiana",
      "state": "Punjab",
      "pincode": "141114",
      "coordinates": { "lat": 30.8358, "lng": 76.1917 }
    },
    "landHoldingAcres": 12.5,
    "registeredDate": "12-Feb-2024",
    "bankAccountMasked": "Punjab National Bank (A/C: *******4891)"
  }
}
```

#### `POST /api/auth/register`
- **Description**: Register a new farmer with village, landholding, and DBT details
- **Request Body**:
```json
{
  "fullName": "Manpreet Kaur",
  "mobileNumber": "+91 98140 55678",
  "aadhaarNumber": "5421-9876-1234",
  "village": "Kohara",
  "tehsil": "Sahnewal",
  "district": "Ludhiana",
  "state": "Punjab",
  "pincode": "141112",
  "landHoldingAcres": 7.5,
  "primaryCrop": "Wheat (गेहूं)",
  "bankAccountMasked": "State Bank of India (A/C: *******8821)"
}
```
- **Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "farmer": {
    "farmerId": "FID-2026-4821",
    "fullName": "Manpreet Kaur",
    "mobileNumber": "+91 98140 55678",
    "location": { ... },
    "landHoldingAcres": 7.5,
    "registeredDate": "13-Sep-2026",
    "bankAccountMasked": "State Bank of India (A/C: *******8821)"
  }
}
```

#### `POST /api/auth/send-otp`
- **Request Body**: `{ "mobileNumber": "+91 98765 43210" }`
- **Response**: `{ "status": "sent", "validitySeconds": 300 }`

---

### 3.2 Mandi Slot Bookings (`/api/bookings`)

#### `GET /api/bookings`
- Returns all bookings for the authenticated farmer.

#### `POST /api/bookings`
- **Request Body**:
```json
{
  "cropId": "crop-wheat",
  "quantityQuintals": 30,
  "expectedDate": "2026-09-18",
  "centreId": "centre-samrala",
  "slot": "09:00 AM - 11:00 AM"
}
```
- **Response**: Full `Booking` object with generated `bookingId` (e.g. `BK-2026-8921`) and queue status.

#### `POST /api/bookings/{booking_id}/cancel`
- Cancels an active reservation and updates mandi capacity counters.

#### `POST /api/bookings/{booking_id}/reschedule`
- **Request Body**:
```json
{
  "expectedDate": "2026-09-20",
  "slot": "11:00 AM - 01:00 PM"
}
```

---

### 3.3 Live Queue Telemetry (`/api/queue`)

#### `GET /api/queue/{booking_id}/status`
- **Response**:
```json
{
  "bookingId": "BK-2026-7842",
  "queuePosition": 3,
  "farmersAhead": 2,
  "estimatedWaitMinutes": 25,
  "status": "IN_QUEUE",
  "gateStatus": "Weighbridge Gate 2 Operational"
}
```

---

### 3.4 Procurement Centres (`/api/centres`)

#### `GET /api/centres?crop=crop-wheat&lat=30.8358&lng=76.1917`
- Returns nearby mandis with AI-recommended badges, distances, queue load levels, and slot availability.

---

### 3.5 Payments & Direct Benefit Transfer (`/api/payments`)

#### `GET /api/payments`
- Returns DBT transaction records with PFMS transaction IDs, bank details, credit timestamps, and MSP calculation breakdowns.
