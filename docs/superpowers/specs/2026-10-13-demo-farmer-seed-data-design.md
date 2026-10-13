# Design Specification: Demo Farmer & Showcase Seed Data

**Date:** 2026-10-13  
**Status:** Approved  
**Target:** Backend & VPS Database  

---

## 1. Overview & Objective
To facilitate prototype showcases, hackathon judging, and end-to-end user testing of Krayam, provide a fully-configured demo farmer persona ("Ramesh Patel") pre-loaded with rich operational lifecycle data. This guarantees that immediately upon logging in with the demo credentials, both the farmer portal and mandi operator terminal display active gate passes, queue positions, and settled payment receipts without requiring prior multi-step manual setup.

---

## 2. Demo Farmer Persona Specifications

### 2.1 Identity & Authentication
- **Full Name:** `Ramesh Patel`
- **Phone Number:** `9876543200`
- **Password:** `Password123!`
- **Password Hash:** PBKDF2-HMAC-SHA256 generated via `app.utils.security.hash_password`
- **Farmer ID:** `F-MH-DEMO-01`
- **Verification Flags:** `is_verified = True`, `is_active = True`

### 2.2 Geography & Location
- **Village:** `Lasalgaon`
- **District:** `Nashik`
- **State:** `Maharashtra`
- **Pincode:** `422306`
- **Coordinates:** `20.1478` N, `74.2255` E (in proximity to APMC Lasalgaon Mandi)

---

## 3. Operational Showcase Data

### 3.1 Upcoming Active Booking (Gate Pass & Queue Demonstration)
- **Booking Code:** `BK-DEMO-UPCOMING`
- **Procurement Centre:** APMC Lasalgaon Mandi (`11111111-1111-1111-1111-111111111111`)
- **Crop:** `Soybean`
- **Quantity:** `25.0` quintals
- **Expected Date:** Tomorrow (`today + timedelta(days=1)`)
- **Assigned Slot:** Next day morning slot (10:00 AM – 12:00 PM)
- **Status:** `confirmed`
- **Showcase Utility:** Generates valid HMAC-signed digital gate pass QR (`/p/BK-DEMO-UPCOMING`). The operator portal can scan this QR code live at the gate check-in terminal to test intake workflows.

### 3.2 Past Completed Transaction (Produce Weighment & Payment Voucher)
- **Booking Code:** `BK-DEMO-PAST`
- **Procurement Centre:** APMC Lasalgaon Mandi
- **Crop:** `Wheat`
- **Quantity:** `40.0` quintals
- **Expected Date:** 3 days ago (`today - timedelta(days=3)`)
- **Status:** `completed`

#### Associated Procurement Intake:
- **Procurement ID:** `PRC-DEMO-PAST`
- **Accepted Quantity:** `40.0` quintals
- **Quality Grade:** `Grade A (Clean, <10% moisture)`
- **Unit Price (MSP):** `₹2,275.00` per quintal
- **Status:** `completed`

#### Associated Payment Record:
- **Payment ID:** `PAY-DEMO-PAST`
- **Total Settlement Amount:** `₹91,000.00` (`40.0 × ₹2,275.00`)
- **Status:** `confirmed`
- **Verified By:** `Operator - APMC Lasalgaon`
- **Showcase Utility:** The farmer's history and transaction screens display a settled transaction with an accessible digital payment voucher and download receipt (`/r/PAY-DEMO-PAST`).

---

## 4. Seeding Mechanism & Architecture

### 4.1 Standalone Idempotent Script (`backend/seed_demo_farmer.py`)
- May be invoked independently at any time (`python seed_demo_farmer.py`).
- Idempotent cleanup: Purges existing records with phone `9876543200` or IDs `F-MH-DEMO-01`, `BK-DEMO-UPCOMING`, `BK-DEMO-PAST`, `PAY-DEMO-PAST` before creating fresh records.
- Ensures the Lasalgaon centre exists (attaches to it or creates it if missing).
- Safely generates and links the farmer, bookings, procurement, and payment records.

### 4.2 Full Seed Integration (`backend/seed_data.py`)
- Integrated into `clean_and_seed()` in `backend/seed_data.py` so that any full database wipe-and-reseed automatically includes the demo farmer.

---

## 5. Automated Verification & Deployment

### 5.1 Verification Tests (`backend/tests/test_demo_farmer_seed.py`)
- Test script execution creates all entities cleanly.
- Test login with `9876543200` and `Password123!` against `POST /api/v1/auth/login` returns status 200 with JWT access token.
- Test active booking `BK-DEMO-UPCOMING` returns confirmed status and accessible gate pass.
- Test completed payment `PAY-DEMO-PAST` returns confirmed status with amount 91,000.

### 5.2 VPS Deployment
- Commit changes to git and push to `origin/master`.
- Execute `python seed_demo_farmer.py` in the VPS virtual environment (`185.163.2.47`).
- Verify login against production API endpoint `https://hizru.me/api/v1/auth/login`.
