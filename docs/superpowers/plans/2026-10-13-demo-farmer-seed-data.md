# Demo Farmer & Showcase Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an idempotent seed script and automated test suite for demo farmer "Ramesh Patel" (`9876543200` / `Password123!`), complete with active booking QR gate pass and historical completed procurement/payout records, integrated into the database seed process and deployed to the VPS.

**Architecture:** A standalone idempotent seeder module `backend/seed_demo_farmer.py` using SQLAlchemy 2.0 Async to safely purge and seed demo farmer data; integrated into `backend/seed_data.py`; verified via `backend/tests/test_demo_farmer_seed.py`; executed against local PostgreSQL and production VPS.

**Tech Stack:** Python 3.10+, SQLAlchemy 2.0 Async, FastAPI, PostgreSQL, pytest, HTTPX.

## Global Constraints
- Target phone number: `9876543200`
- Target password: `Password123!` (hashed using `app.utils.security.hash_password`)
- Farmer ID: `F-MH-DEMO-01`
- Associated Centre: APMC Lasalgaon Mandi (`11111111-1111-1111-1111-111111111111`)
- Upcoming Booking: `BK-DEMO-UPCOMING` (Soybean, 25.0 quintals, tomorrow, confirmed)
- Past Booking & Payment: `BK-DEMO-PAST` (Wheat, 40.0 quintals, completed), `PRC-DEMO-PAST`, `PAY-DEMO-PAST` (₹91,000.00, confirmed)

---

### Task 1: Demo Farmer Seed Module

**Files:**
- Create: `backend/seed_demo_farmer.py`
- Test: `backend/tests/test_demo_farmer_seed.py`

**Interfaces:**
- Produces: `async def seed_demo_farmer(db: AsyncSession | None = None) -> dict` in `backend/seed_demo_farmer.py`

- [ ] **Step 1: Write test for seed_demo_farmer in `backend/tests/test_demo_farmer_seed.py`**

```python
import unittest
from datetime import date, timedelta
import httpx
from sqlalchemy import text
from app.database import async_session_factory, engine
from app.main import app
from seed_demo_farmer import seed_demo_farmer


class TestDemoFarmerSeed(unittest.IsolatedAsyncioTestCase):
    async def asyncTearDown(self) -> None:
        await engine.dispose()

    async def test_seed_demo_farmer_idempotent(self) -> None:
        # Run seed
        result = await seed_demo_farmer()
        self.assertEqual(result["phone"], "9876543200")
        self.assertEqual(result["name"], "Ramesh Patel")

        # Verify DB records
        async with async_session_factory() as db:
            farmer_row = (
                await db.execute(
                    text("SELECT name, phone, village, district, state, pincode, is_verified, is_active FROM farmers WHERE phone = '9876543200'")
                )
            ).first()
            self.assertIsNotNone(farmer_row)
            self.assertEqual(farmer_row[0], "Ramesh Patel")
            self.assertEqual(farmer_row[1], "9876543200")
            self.assertEqual(farmer_row[2], "Lasalgaon")
            self.assertEqual(farmer_row[3], "Nashik")
            self.assertEqual(farmer_row[4], "Maharashtra")
            self.assertEqual(farmer_row[5], "422306")
            self.assertTrue(farmer_row[6])
            self.assertTrue(farmer_row[7])

            # Verify upcoming booking
            upcoming = (
                await db.execute(
                    text("SELECT crop, quantity, status FROM bookings WHERE booking_id = 'BK-DEMO-UPCOMING'")
                )
            ).first()
            self.assertIsNotNone(upcoming)
            self.assertEqual(upcoming[0], "Soybean")
            self.assertEqual(float(upcoming[1]), 25.0)
            self.assertEqual(upcoming[2], "confirmed")

            # Verify past booking and payment
            past_pay = (
                await db.execute(
                    text("SELECT amount, status FROM payments WHERE payment_id = 'PAY-DEMO-PAST'")
                )
            ).first()
            self.assertIsNotNone(past_pay)
            self.assertEqual(float(past_pay[0]), 91000.0)
            self.assertEqual(past_pay[1], "confirmed")

        # Test login via API
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"phone": "9876543200", "password": "Password123!"},
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("access_token", data)
            self.assertEqual(data["farmer"]["name"], "Ramesh Patel")
            self.assertEqual(data["farmer"]["phone"], "9876543200")

        # Run again to ensure idempotency
        second_result = await seed_demo_farmer()
        self.assertEqual(second_result["phone"], "9876543200")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_demo_farmer_seed.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'seed_demo_farmer'`

- [ ] **Step 3: Implement `backend/seed_demo_farmer.py`**

```python
import asyncio
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.models.centre import Centre
from app.models.farmer import Farmer
from app.models.payment import Payment, PaymentStatus
from app.models.procurement import Procurement
from app.models.slot import Slot
from app.utils.security import hash_password

DEMO_PHONE = "9876543200"
DEMO_PASSWORD = "Password123!"
DEMO_FARMER_ID = "F-MH-DEMO-01"
LASALGAON_CENTRE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
UPCOMING_BOOKING_ID = "BK-DEMO-UPCOMING"
PAST_BOOKING_ID = "BK-DEMO-PAST"
PAST_PROCUREMENT_ID = "PRC-DEMO-PAST"
PAST_PAYMENT_ID = "PAY-DEMO-PAST"


async def clean_existing_demo_farmer(db: AsyncSession) -> None:
    """Purge prior demo farmer records cleanly and idempotently."""
    await db.execute(
        text("DELETE FROM payments WHERE payment_id = :pid"),
        {"pid": PAST_PAYMENT_ID},
    )
    await db.execute(
        text("DELETE FROM procurements WHERE procurement_id = :prcid"),
        {"prcid": PAST_PROCUREMENT_ID},
    )
    await db.execute(
        text("DELETE FROM queue_entries WHERE booking_id IN (SELECT id FROM bookings WHERE booking_id IN (:b1, :b2))"),
        {"b1": UPCOMING_BOOKING_ID, "b2": PAST_BOOKING_ID},
    )
    await db.execute(
        text("DELETE FROM bookings WHERE booking_id IN (:b1, :b2)"),
        {"b1": UPCOMING_BOOKING_ID, "b2": PAST_BOOKING_ID},
    )
    await db.execute(
        text("DELETE FROM sms_messages WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM sms_sessions WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM otps WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM farmers WHERE phone = :p OR farmer_id = :fid"),
        {"p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.commit()


async def seed_demo_farmer(db: AsyncSession | None = None) -> dict:
    """Seed Ramesh Patel demo farmer and full showcase lifecycle data."""
    if db is None:
        async with async_session_factory() as session:
            return await _seed_with_session(session)
    return await _seed_with_session(db)


async def _seed_with_session(db: AsyncSession) -> dict:
    await clean_existing_demo_farmer(db)

    # Ensure APMC Lasalgaon Centre exists
    centre = (
        await db.execute(
            select(Centre).where(Centre.id == LASALGAON_CENTRE_ID)
        )
    ).scalar_one_or_none()

    if not centre:
        centre = Centre(
            id=LASALGAON_CENTRE_ID,
            name="APMC Lasalgaon Mandi",
            code="MH-LASAL-01",
            address="Main Market Yard, Lasalgaon",
            village="Lasalgaon",
            district="Nashik",
            state="Maharashtra",
            latitude=20.1478,
            longitude=74.2255,
            capacity=200,
            operating_start=time(8, 0),
            operating_end=time(18, 0),
            is_active=True,
        )
        db.add(centre)
        await db.flush()

    # Create Demo Farmer
    farmer_uuid = uuid.uuid4()
    farmer = Farmer(
        id=farmer_uuid,
        name="Ramesh Patel",
        phone=DEMO_PHONE,
        farmer_id=DEMO_FARMER_ID,
        password_hash=hash_password(DEMO_PASSWORD),
        village="Lasalgaon",
        district="Nashik",
        state="Maharashtra",
        pincode="422306",
        latitude=20.1478,
        longitude=74.2255,
        is_verified=True,
        is_active=True,
    )
    db.add(farmer)
    await db.flush()

    # Ensure slot exists for tomorrow
    tomorrow = date.today() + timedelta(days=1)
    slot = (
        await db.execute(
            select(Slot).where(
                Slot.centre_id == LASALGAON_CENTRE_ID,
                Slot.date == tomorrow,
            )
        )
    ).scalars().first()

    if not slot:
        slot = Slot(
            id=uuid.uuid4(),
            centre_id=LASALGAON_CENTRE_ID,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(12, 0),
            max_bookings=25,
            current_bookings=1,
            is_available=True,
        )
        db.add(slot)
        await db.flush()
    else:
        slot.current_bookings += 1

    # 1. Active Upcoming Booking (Tomorrow)
    upcoming_uuid = uuid.uuid4()
    upcoming_booking = Booking(
        id=upcoming_uuid,
        booking_id=UPCOMING_BOOKING_ID,
        farmer_id=farmer_uuid,
        centre_id=LASALGAON_CENTRE_ID,
        slot_id=slot.id,
        crop="Soybean",
        quantity=25.0,
        unit="quintal",
        expected_date=tomorrow,
        is_walk_in=False,
        status=BookingStatus.CONFIRMED,
    )
    db.add(upcoming_booking)

    # 2. Past Completed Booking (3 days ago)
    past_date = date.today() - timedelta(days=3)
    past_booking_uuid = uuid.uuid4()
    past_booking = Booking(
        id=past_booking_uuid,
        booking_id=PAST_BOOKING_ID,
        farmer_id=farmer_uuid,
        centre_id=LASALGAON_CENTRE_ID,
        crop="Wheat",
        quantity=40.0,
        unit="quintal",
        expected_date=past_date,
        is_walk_in=False,
        status=BookingStatus.COMPLETED,
    )
    db.add(past_booking)
    await db.flush()

    # Past Procurement Intake
    procurement_uuid = uuid.uuid4()
    procurement = Procurement(
        id=procurement_uuid,
        procurement_id=PAST_PROCUREMENT_ID,
        booking_id=past_booking_uuid,
        accepted_quantity=40.0,
        unit_price=2275.0,
        quality_grade="Grade A (Clean, <10% moisture)",
        unit="quintal",
        quality_notes="High quality grain verified at intake weighbridge.",
        processing_start=datetime.combine(past_date, time(9, 30), tzinfo=timezone.utc),
        processing_end=datetime.combine(past_date, time(10, 15), tzinfo=timezone.utc),
        status="completed",
    )
    db.add(procurement)
    await db.flush()

    # Past Payment Record
    payment_uuid = uuid.uuid4()
    payment = Payment(
        id=payment_uuid,
        payment_id=PAST_PAYMENT_ID,
        procurement_id=procurement_uuid,
        farmer_id=farmer_uuid,
        quantity=40.0,
        rate=2275.0,
        amount=91000.0,
        status=PaymentStatus.CONFIRMED,
        verified_by="Operator - APMC Lasalgaon",
        verified_at=datetime.combine(past_date, time(10, 20), tzinfo=timezone.utc),
        confirmed_at=datetime.combine(past_date, time(10, 30), tzinfo=timezone.utc),
    )
    db.add(payment)

    await db.commit()

    return {
        "farmer_id": DEMO_FARMER_ID,
        "name": "Ramesh Patel",
        "phone": DEMO_PHONE,
        "password": DEMO_PASSWORD,
        "upcoming_booking": UPCOMING_BOOKING_ID,
        "past_booking": PAST_BOOKING_ID,
        "past_payment": PAST_PAYMENT_ID,
    }


if __name__ == "__main__":
    res = asyncio.run(seed_demo_farmer())
    print("Demo farmer successfully seeded:")
    for k, v in res.items():
        print(f"  {k}: {v}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_demo_farmer_seed.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/seed_demo_farmer.py backend/tests/test_demo_farmer_seed.py
git commit -m "feat(seed): add idempotent demo farmer seed module"
```

---

### Task 2: Integrate Demo Farmer into Main Seed Script

**Files:**
- Modify: `backend/seed_data.py`

**Interfaces:**
- Consumes: `seed_demo_farmer` from `seed_demo_farmer.py`

- [ ] **Step 1: Update `backend/seed_data.py` to import and invoke `seed_demo_farmer`**

In `backend/seed_data.py`:
- Import `from seed_demo_farmer import seed_demo_farmer`
- At the end of `clean_and_seed()`, call `await seed_demo_farmer(db)`
- Update console printout to announce demo farmer seeding

- [ ] **Step 2: Run linter and tests**

Run:
```bash
ruff check backend/seed_data.py backend/seed_demo_farmer.py
pytest backend/tests/test_demo_farmer_seed.py -v
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/seed_data.py
git commit -m "feat(seed): link demo farmer into main database seed"
```

---

### Task 3: Execution on Local & Production VPS Deployment

**Files:**
- None (deployment and database verification)

- [ ] **Step 1: Execute local seed script**

Run: `python backend/seed_demo_farmer.py`  
Expected: Outputs seeded demo farmer details (`9876543200`, `Ramesh Patel`, `Password123!`, `BK-DEMO-UPCOMING`, `PAY-DEMO-PAST`).

- [ ] **Step 2: Push changes to GitHub `master`**

Run: `git push origin master`

- [ ] **Step 3: Sync changes to production VPS and run seed**

Run via paramiko script on `185.163.2.47`:
```bash
cd /root/krayam
git pull
source venv/bin/activate
python seed_demo_farmer.py
systemctl restart krayam.service
```

- [ ] **Step 4: Verify production API authentication**

Run curl check against `https://hizru.me/api/v1/auth/login` with `{"phone": "9876543200", "password": "Password123!"}`.  
Expected: HTTP 200 with JWT access token.
