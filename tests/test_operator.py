import logging
import os
import sys
import unittest
import uuid
from datetime import date, timedelta

# Ensure repo root is on sys.path for direct script execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
from sqlalchemy import text

from app.config import get_settings
from app.database import async_session_factory, engine
from app.main import app
from app.services.auth import auth_service
from app.services.operator import operator_service

# Reduce database query log verbosity during test runs
engine.echo = False
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

settings = get_settings()


class TestOperator(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TO{uuid.uuid4().hex[:6].upper()}"
        self.centre_a_id = str(uuid.uuid4())
        self.centre_b_id = str(uuid.uuid4())
        self.farmer_id = str(uuid.uuid4())
        self.booking_a_id = str(uuid.uuid4())
        self.booking_b_id = str(uuid.uuid4())
        self.tomorrow = date.today() + timedelta(days=1)

        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_a_id,
                    "name": f"Centre A {self.test_prefix}",
                    "code": f"CA-{self.test_prefix}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 20.0, 75.0, 50, true, now())"
                ),
                {
                    "id": self.centre_b_id,
                    "name": f"Centre B {self.test_prefix}",
                    "code": f"CB-{self.test_prefix}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'Farmer Test', true, true, now())"
                ),
                {
                    "id": self.farmer_id,
                    "fid": f"F-{self.test_prefix}",
                    "phone": f"+9197{uuid.uuid4().int % 10**8:08d}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO bookings (id, booking_id, farmer_id, centre_id, crop, quantity, unit, expected_date, status, created_at) "
                    "VALUES (:id, :bid, :fid, :cid, 'Wheat', 10.0, 'quintal', :d, 'confirmed', now())"
                ),
                {
                    "id": self.booking_a_id,
                    "bid": f"BKA-{self.test_prefix}",
                    "fid": self.farmer_id,
                    "cid": self.centre_a_id,
                    "d": self.tomorrow,
                },
            )
            await db.execute(
                text(
                    "INSERT INTO bookings (id, booking_id, farmer_id, centre_id, crop, quantity, unit, expected_date, status, created_at) "
                    "VALUES (:id, :bid, :fid, :cid, 'Wheat', 10.0, 'quintal', :d, 'confirmed', now())"
                ),
                {
                    "id": self.booking_b_id,
                    "bid": f"BKB-{self.test_prefix}",
                    "fid": self.farmer_id,
                    "cid": self.centre_b_id,
                    "d": self.tomorrow,
                },
            )
            await db.commit()

            # Create Operator for Centre A
            self.op_phone = f"+9196{uuid.uuid4().int % 10**8:08d}"
            self.op_password = "Password@123"
            self.op = await operator_service.register(
                db,
                name="Op A",
                phone=self.op_phone,
                password=self.op_password,
                centre_id=uuid.UUID(self.centre_a_id),
            )
            await db.commit()

        self.token_a = operator_service.token_for(self.op)
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(
                text("DELETE FROM outbox_events WHERE centre_id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM events WHERE entity_id in (:ba, :bb)"),
                {"ba": self.booking_a_id, "bb": self.booking_b_id},
            )
            await db.execute(
                text(
                    "DELETE FROM payments WHERE procurement_id in (SELECT id FROM procurements WHERE booking_id in (:ba, :bb))"
                ),
                {"ba": self.booking_a_id, "bb": self.booking_b_id},
            )
            await db.execute(
                text("DELETE FROM procurements WHERE booking_id in (:ba, :bb)"),
                {"ba": self.booking_a_id, "bb": self.booking_b_id},
            )
            await db.execute(
                text("DELETE FROM queue_entries WHERE centre_id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM bookings WHERE centre_id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM operators WHERE centre_id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM centres WHERE id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(text("DELETE FROM farmers WHERE id = :fid"), {"fid": self.farmer_id})
            await db.commit()
        await engine.dispose()

    async def test_operator_login_and_centre_isolation(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Login
            resp = await client.post(
                "/api/v1/operator/login",
                json={"phone": self.op_phone, "password": self.op_password},
            )
            self.assertEqual(resp.status_code, 200)
            self.assertIn("access_token", resp.json())

            # Attempt to access Centre B's queue using Centre A's operator token -> 403 FORBIDDEN
            resp_cross = await client.get(
                f"/api/v1/operator/queue/{self.centre_b_id}", headers=self.headers_a
            )
            self.assertEqual(resp_cross.status_code, 403)

            # Check-in Centre B's booking using Centre A's operator token -> 422 VALIDATION_ERROR ("Booking does not belong to this centre")
            resp_checkin = await client.post(
                "/api/v1/operator/check-in",
                json={"booking_id": self.booking_b_id},
                headers=self.headers_a,
            )
            self.assertEqual(resp_checkin.status_code, 422)

    async def test_duplicate_payment_prevention_regression(self) -> None:
        """Regression test for Fix 5: initiating payment twice for same procurement must fail with 409 CONFLICT."""
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Check-in booking A
            resp_ci = await client.post(
                "/api/v1/operator/check-in",
                json={"booking_id": self.booking_a_id},
                headers=self.headers_a,
            )
            self.assertEqual(resp_ci.status_code, 200)
            qe_id = resp_ci.json()["id"]

            # Call and start processing
            await client.post("/api/v1/operator/call-next", headers=self.headers_a)
            await client.post(f"/api/v1/operator/queue/{qe_id}/start", headers=self.headers_a)

            # Record procurement
            resp_proc = await client.post(
                "/api/v1/operator/procurements",
                json={
                    "booking_id": self.booking_a_id,
                    "accepted_quantity": 10.0,
                    "unit": "quintal",
                },
                headers=self.headers_a,
            )
            self.assertEqual(resp_proc.status_code, 201)
            proc_id = resp_proc.json()["id"]

            # First payment initiation succeeds
            resp_pmt1 = await client.post(
                f"/api/v1/operator/procurements/{proc_id}/payment", headers=self.headers_a
            )
            self.assertEqual(resp_pmt1.status_code, 200)
            pmt_id = resp_pmt1.json()["id"]

            # Second payment initiation must fail with 409 CONFLICT
            resp_pmt2 = await client.post(
                f"/api/v1/operator/procurements/{proc_id}/payment", headers=self.headers_a
            )
            self.assertEqual(resp_pmt2.status_code, 409)

            # Review payload must succeed without MultipleResultsFound 500 error
            resp_rev = await client.get(
                f"/api/v1/operator/procurements/{proc_id}/review", headers=self.headers_a
            )
            self.assertEqual(resp_rev.status_code, 200)

            # Verify payment
            resp_ver = await client.post(
                f"/api/v1/operator/payments/{pmt_id}/verify",
                json={"confirmed": True, "verified_by": "Manager"},
                headers=self.headers_a,
            )
            self.assertEqual(resp_ver.status_code, 200)

    async def test_entity_events_idor_security_regression(self) -> None:
        """Regression test for Fix 1: cross-centre payment/procurement events must be blocked."""
        # Create a procurement in Centre B
        proc_b_id = str(uuid.uuid4())
        pmt_b_id = str(uuid.uuid4())
        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO procurements (id, procurement_id, booking_id, accepted_quantity, unit, created_at) "
                    "VALUES (:id, :pid, :bid, 5.0, 'quintal', now())"
                ),
                {"id": proc_b_id, "pid": f"PRB-{self.test_prefix}", "bid": self.booking_b_id},
            )
            await db.execute(
                text(
                    "INSERT INTO payments (id, payment_id, procurement_id, farmer_id, quantity, rate, amount, status, created_at) "
                    "VALUES (:id, :pid, :prid, :fid, 5.0, 2000.0, 10000.0, 'initiated', now())"
                ),
                {
                    "id": pmt_b_id,
                    "pid": f"PMB-{self.test_prefix}",
                    "prid": proc_b_id,
                    "fid": self.farmer_id,
                },
            )
            await db.commit()

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Centre A operator requests Centre B procurement events -> 403 FORBIDDEN
            resp_proc = await client.get(
                f"/api/v1/operator/events/procurement/{proc_b_id}", headers=self.headers_a
            )
            self.assertEqual(resp_proc.status_code, 403)

            # Centre A operator requests Centre B payment events -> 403 FORBIDDEN
            resp_pmt = await client.get(
                f"/api/v1/operator/events/payment/{pmt_b_id}", headers=self.headers_a
            )
            self.assertEqual(resp_pmt.status_code, 403)

            # Unknown entity type -> 422 VALIDATION_ERROR
            resp_unsupported = await client.get(
                f"/api/v1/operator/events/unknown_type/{proc_b_id}", headers=self.headers_a
            )
            self.assertEqual(resp_unsupported.status_code, 422)

    async def test_operator_bookings_search_and_filter(self) -> None:
        """Test GET /api/v1/operator/bookings with auth checks and query filters."""
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Unauthenticated request -> 401/403
            resp_no_auth = await client.get("/api/v1/operator/bookings")
            self.assertIn(resp_no_auth.status_code, [401, 403])

            # Farmer token -> 401/403
            farmer_token = auth_service.create_access_token(self.farmer_id, role="farmer")
            resp_farmer = await client.get(
                "/api/v1/operator/bookings",
                headers={"Authorization": f"Bearer {farmer_token}"},
            )
            self.assertIn(resp_farmer.status_code, [401, 403])

            # Valid operator token for Centre A
            resp = await client.get("/api/v1/operator/bookings", headers=self.headers_a)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("items", data)
            self.assertIn("total", data)
            self.assertGreaterEqual(data["total"], 1)

            # Assert only centre_a bookings are returned
            item_bids = [item["booking_id"] for item in data["items"]]
            self.assertIn(f"BKA-{self.test_prefix}", item_bids)
            self.assertNotIn(f"BKB-{self.test_prefix}", item_bids)

            # Query filter: search by booking code
            resp_search = await client.get(
                f"/api/v1/operator/bookings?search=BKA-{self.test_prefix}",
                headers=self.headers_a,
            )
            self.assertEqual(resp_search.status_code, 200)
            search_data = resp_search.json()
            self.assertEqual(search_data["total"], 1)
            self.assertEqual(search_data["items"][0]["booking_id"], f"BKA-{self.test_prefix}")

            # Query filter: crop
            resp_crop = await client.get(
                "/api/v1/operator/bookings?crop=wheat", headers=self.headers_a
            )
            self.assertEqual(resp_crop.status_code, 200)
            self.assertGreaterEqual(resp_crop.json()["total"], 1)

            resp_no_crop = await client.get(
                "/api/v1/operator/bookings?crop=nonexistentcrop", headers=self.headers_a
            )
            self.assertEqual(resp_no_crop.status_code, 200)
            self.assertEqual(resp_no_crop.json()["total"], 0)

            # Query filter: status
            resp_status = await client.get(
                "/api/v1/operator/bookings?status=confirmed", headers=self.headers_a
            )
            self.assertEqual(resp_status.status_code, 200)
            self.assertGreaterEqual(resp_status.json()["total"], 1)

    async def test_operator_dashboard(self) -> None:
        """Test GET /api/v1/operator/dashboard schema keys and centre scope."""
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Unauthenticated request -> 401/403
            resp_no_auth = await client.get("/api/v1/operator/dashboard")
            self.assertIn(resp_no_auth.status_code, [401, 403])

            # Farmer token -> 401/403
            farmer_token = auth_service.create_access_token(self.farmer_id, role="farmer")
            resp_farmer = await client.get(
                "/api/v1/operator/dashboard",
                headers={"Authorization": f"Bearer {farmer_token}"},
            )
            self.assertIn(resp_farmer.status_code, [401, 403])

            # Valid operator token
            resp = await client.get("/api/v1/operator/dashboard", headers=self.headers_a)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()

            # Assert top-level keys match OperatorDashboardResponse schema
            expected_keys = {
                "centre_id",
                "today",
                "bookings_today_total",
                "queue",
                "procurement",
                "payments",
                "capacity",
                "sync",
            }
            self.assertTrue(expected_keys.issubset(set(data.keys())))
            self.assertEqual(str(data["centre_id"]), self.centre_a_id)

            # Assert sub-schema keys
            self.assertIn("waiting_count", data["queue"])
            self.assertIn("called_count", data["queue"])
            self.assertIn("processing_count", data["queue"])
            self.assertIn("estimated_wait_minutes", data["queue"])

            self.assertIn("completed_today_count", data["procurement"])
            self.assertIn("total_tonnage_today", data["procurement"])

            self.assertIn("pending_count", data["payments"])
            self.assertIn("pending_amount", data["payments"])
            self.assertIn("flagged_count", data["payments"])

            self.assertIn("daily_capacity", data["capacity"])
            self.assertIn("utilization_percent", data["capacity"])

            self.assertIn("max_outbox_id", data["sync"])

    async def test_operator_payments(self) -> None:
        """Test GET /api/v1/operator/payments listing, pagination, and multi-tenancy."""
        # Insert a procurement and payment for Centre A
        proc_a_id = str(uuid.uuid4())
        pmt_a_id = str(uuid.uuid4())
        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO procurements (id, procurement_id, booking_id, accepted_quantity, unit, created_at) "
                    "VALUES (:id, :pid, :bid, 10.0, 'quintal', now())"
                ),
                {"id": proc_a_id, "pid": f"PRA-{self.test_prefix}", "bid": self.booking_a_id},
            )
            await db.execute(
                text(
                    "INSERT INTO payments (id, payment_id, procurement_id, farmer_id, quantity, rate, amount, status, created_at) "
                    "VALUES (:id, :pid, :prid, :fid, 10.0, 2500.0, 25000.0, 'initiated', now())"
                ),
                {
                    "id": pmt_a_id,
                    "pid": f"PMA-{self.test_prefix}",
                    "prid": proc_a_id,
                    "fid": self.farmer_id,
                },
            )
            await db.commit()

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Unauthenticated request -> 401/403
            resp_no_auth = await client.get("/api/v1/operator/payments")
            self.assertIn(resp_no_auth.status_code, [401, 403])

            # Farmer token -> 401/403
            farmer_token = auth_service.create_access_token(self.farmer_id, role="farmer")
            resp_farmer = await client.get(
                "/api/v1/operator/payments",
                headers={"Authorization": f"Bearer {farmer_token}"},
            )
            self.assertIn(resp_farmer.status_code, [401, 403])

            # Valid operator token
            resp = await client.get("/api/v1/operator/payments", headers=self.headers_a)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()

            # Assert response structure
            self.assertIn("items", data)
            self.assertIn("total", data)
            self.assertIn("limit", data)
            self.assertIn("offset", data)
            self.assertEqual(data["total"], 1)
            self.assertEqual(data["items"][0]["payment_id"], f"PMA-{self.test_prefix}")
            self.assertEqual(data["items"][0]["farmer_name"], "Farmer Test")
            self.assertEqual(data["items"][0]["amount"], 25000.0)

            # Query filter: status
            resp_status = await client.get(
                "/api/v1/operator/payments?status=initiated", headers=self.headers_a
            )
            self.assertEqual(resp_status.status_code, 200)
            self.assertEqual(resp_status.json()["total"], 1)

            resp_status_none = await client.get(
                "/api/v1/operator/payments?status=confirmed", headers=self.headers_a
            )
            self.assertEqual(resp_status_none.status_code, 200)
            self.assertEqual(resp_status_none.json()["total"], 0)

            # Date validation: from_date > to_date -> 422
            resp_invalid_date = await client.get(
                "/api/v1/operator/payments?from_date=2026-09-15&to_date=2026-09-10",
                headers=self.headers_a,
            )
            self.assertEqual(resp_invalid_date.status_code, 422)


if __name__ == "__main__":
    unittest.main()
