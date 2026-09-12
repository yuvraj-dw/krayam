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
from app.services.qr import qr_service

# Reduce database query log verbosity during test runs
engine.echo = False
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

settings = get_settings()


class TestQRCodeFeatures(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TQR{uuid.uuid4().hex[:6].upper()}"
        self.centre_a_id = str(uuid.uuid4())
        self.centre_b_id = str(uuid.uuid4())
        self.farmer_a_id = str(uuid.uuid4())
        self.farmer_b_id = str(uuid.uuid4())
        self.slot_a_id = str(uuid.uuid4())
        self.booking_a_id = str(uuid.uuid4())
        self.booking_b_id = str(uuid.uuid4())
        self.procurement_a_id = str(uuid.uuid4())
        self.payment_a_id = str(uuid.uuid4())
        self.tomorrow = date.today() + timedelta(days=1)

        async with async_session_factory() as db:
            # Create Centre A
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
            # Create Centre B
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
            # Create Farmer A
            self.farmer_a_name = f"Farmer A {self.test_prefix}"
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, :name, true, true, now())"
                ),
                {
                    "id": self.farmer_a_id,
                    "fid": f"FA-{self.test_prefix}",
                    "phone": f"+9191{uuid.uuid4().int % 10**8:08d}",
                    "name": self.farmer_a_name,
                },
            )
            # Create Farmer B
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'Farmer B Test', true, true, now())"
                ),
                {
                    "id": self.farmer_b_id,
                    "fid": f"FB-{self.test_prefix}",
                    "phone": f"+9192{uuid.uuid4().int % 10**8:08d}",
                },
            )
            # Create Slot for Centre A
            await db.execute(
                text(
                    "INSERT INTO slots (id, centre_id, date, start_time, end_time, max_bookings, current_bookings, is_available) "
                    "VALUES (:id, :cid, :d, '09:00:00', '10:00:00', 5, 1, true)"
                ),
                {"id": self.slot_a_id, "cid": self.centre_a_id, "d": self.tomorrow},
            )
            # Create Booking A (Farmer A, Centre A)
            self.booking_a_code = f"BKA-{self.test_prefix}"
            await db.execute(
                text(
                    "INSERT INTO bookings (id, booking_id, farmer_id, centre_id, slot_id, crop, quantity, unit, expected_date, status, created_at) "
                    "VALUES (:id, :bid, :fid, :cid, :sid, 'Wheat', 15.0, 'quintal', :d, 'confirmed', now())"
                ),
                {
                    "id": self.booking_a_id,
                    "bid": self.booking_a_code,
                    "fid": self.farmer_a_id,
                    "cid": self.centre_a_id,
                    "sid": self.slot_a_id,
                    "d": self.tomorrow,
                },
            )
            # Create Booking B (Farmer B, Centre B)
            self.booking_b_code = f"BKB-{self.test_prefix}"
            await db.execute(
                text(
                    "INSERT INTO bookings (id, booking_id, farmer_id, centre_id, crop, quantity, unit, expected_date, status, created_at) "
                    "VALUES (:id, :bid, :fid, :cid, 'Rice', 20.0, 'quintal', :d, 'confirmed', now())"
                ),
                {
                    "id": self.booking_b_id,
                    "bid": self.booking_b_code,
                    "fid": self.farmer_b_id,
                    "cid": self.centre_b_id,
                    "d": self.tomorrow,
                },
            )
            # Create Procurement for Booking A
            self.procurement_a_code = f"PRA-{self.test_prefix}"
            await db.execute(
                text(
                    "INSERT INTO procurements (id, procurement_id, booking_id, accepted_quantity, unit, status, created_at) "
                    "VALUES (:id, :pid, :bid, 14.5, 'quintal', 'completed', now())"
                ),
                {
                    "id": self.procurement_a_id,
                    "pid": self.procurement_a_code,
                    "bid": self.booking_a_id,
                },
            )
            # Create Payment for Procurement A
            self.payment_a_code = f"PMA-{self.test_prefix}"
            await db.execute(
                text(
                    "INSERT INTO payments (id, payment_id, procurement_id, farmer_id, quantity, rate, amount, status, created_at) "
                    "VALUES (:id, :pid, :prid, :fid, 14.5, 2275.0, 32987.50, 'confirmed', now())"
                ),
                {
                    "id": self.payment_a_id,
                    "pid": self.payment_a_code,
                    "prid": self.procurement_a_id,
                    "fid": self.farmer_a_id,
                },
            )
            await db.commit()

            # Create Operator for Centre A
            self.op_a_phone = f"+9193{uuid.uuid4().int % 10**8:08d}"
            self.op_a = await operator_service.register(
                db,
                name="Op A",
                phone=self.op_a_phone,
                password="Password@123",
                centre_id=uuid.UUID(self.centre_a_id),
            )
            # Create Operator for Centre B
            self.op_b_phone = f"+9194{uuid.uuid4().int % 10**8:08d}"
            self.op_b = await operator_service.register(
                db,
                name="Op B",
                phone=self.op_b_phone,
                password="Password@123",
                centre_id=uuid.UUID(self.centre_b_id),
            )
            await db.commit()

        self.farmer_a_token = auth_service.create_access_token(self.farmer_a_id, role="farmer")
        self.farmer_b_token = auth_service.create_access_token(self.farmer_b_id, role="farmer")
        self.farmer_a_headers = {"Authorization": f"Bearer {self.farmer_a_token}"}
        self.farmer_b_headers = {"Authorization": f"Bearer {self.farmer_b_token}"}

        self.op_a_token = operator_service.token_for(self.op_a)
        self.op_b_token = operator_service.token_for(self.op_b)
        self.op_a_headers = {"Authorization": f"Bearer {self.op_a_token}"}
        self.op_b_headers = {"Authorization": f"Bearer {self.op_b_token}"}

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
                text("DELETE FROM payments WHERE procurement_id in (:pa)"),
                {"pa": self.procurement_a_id},
            )
            await db.execute(
                text("DELETE FROM procurements WHERE id in (:pa)"),
                {"pa": self.procurement_a_id},
            )
            await db.execute(
                text("DELETE FROM queue_entries WHERE centre_id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM bookings WHERE id in (:ba, :bb)"),
                {"ba": self.booking_a_id, "bb": self.booking_b_id},
            )
            await db.execute(
                text("DELETE FROM slots WHERE id = :sid"),
                {"sid": self.slot_a_id},
            )
            await db.execute(
                text("DELETE FROM operators WHERE centre_id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM centres WHERE id in (:ca, :cb)"),
                {"ca": self.centre_a_id, "cb": self.centre_b_id},
            )
            await db.execute(
                text("DELETE FROM farmers WHERE id in (:fa, :fb)"),
                {"fa": self.farmer_a_id, "fb": self.farmer_b_id},
            )
            await db.commit()
        await engine.dispose()

    async def test_booking_gate_pass_qr(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Unauthenticated request returns 401/403
            resp_unauth = await client.get(f"/api/v1/bookings/{self.booking_a_id}/qr")
            self.assertIn(resp_unauth.status_code, [401, 403])

            # 2. Unauthorized farmer token (Farmer B accessing Booking A) -> 403 Forbidden
            resp_unauthz = await client.get(
                f"/api/v1/bookings/{self.booking_a_id}/qr",
                headers=self.farmer_b_headers,
            )
            self.assertEqual(resp_unauthz.status_code, 403)

            # 3. Valid farmer token (Farmer A accessing Booking A) -> 200 OK
            resp = await client.get(
                f"/api/v1/bookings/{self.booking_a_id}/qr",
                headers=self.farmer_a_headers,
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["type"], "GATE_PASS")
            self.assertEqual(data["reference_id"], self.booking_a_code)
            self.assertIn("<svg", data["svg"])
            self.assertTrue(data["data_url"].startswith("data:image/svg+xml"))
            self.assertEqual(data["theme"]["primary_color"], "#1b5e20")
            self.assertIn("qr_data", data)
            decoded = qr_service.verify_and_decode_qr(data["qr_data"])
            self.assertEqual(decoded["booking_id"], self.booking_a_code)
            self.assertEqual(decoded["crop"], "Wheat")

            # 4. Valid operator token for Centre A can also view Booking A QR
            resp_op = await client.get(
                f"/api/v1/bookings/{self.booking_a_id}/qr",
                headers=self.op_a_headers,
            )
            self.assertEqual(resp_op.status_code, 200)

            # 5. Operator for Centre B accessing Booking A QR -> 403 Forbidden
            resp_op_b = await client.get(
                f"/api/v1/bookings/{self.booking_a_id}/qr",
                headers=self.op_b_headers,
            )
            self.assertEqual(resp_op_b.status_code, 403)

    async def test_operator_scan_check_in(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Fetch gate pass QR data from booking endpoint
            qr_resp = await client.get(
                f"/api/v1/bookings/{self.booking_a_id}/qr",
                headers=self.farmer_a_headers,
            )
            self.assertEqual(qr_resp.status_code, 200)
            qr_data = qr_resp.json()["qr_data"]

            # 2. Tampered QR payload -> 422 or 400
            tampered_qr = qr_data[:-4] + ("A" if qr_data[-1] != "A" else "B") * 4
            resp_tampered = await client.post(
                "/api/v1/operator/check-in/scan",
                headers=self.op_a_headers,
                json={"qr_payload": tampered_qr},
            )
            self.assertIn(resp_tampered.status_code, [400, 422])

            # 3. Cross-centre operator scan (Operator B scanning Centre A QR) -> 403 Forbidden
            resp_cross = await client.post(
                "/api/v1/operator/check-in/scan",
                headers=self.op_b_headers,
                json={"qr_payload": qr_data},
            )
            self.assertEqual(resp_cross.status_code, 403)

            # 4. Valid Operator A calls check-in scan -> 200 OK and assigned queue position 1
            resp_scan = await client.post(
                "/api/v1/operator/check-in/scan",
                headers=self.op_a_headers,
                json={"qr_payload": qr_data},
            )
            self.assertEqual(resp_scan.status_code, 200)
            scan_data = resp_scan.json()
            self.assertEqual(scan_data["position"], 1)
            self.assertEqual(scan_data["status"], "waiting")
            self.assertEqual(str(scan_data["centre_id"]), self.centre_a_id)

    async def test_procurement_receipt_qr(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Operator A calls GET /api/v1/operator/procurements/{proc_id}/qr -> 200 OK
            resp = await client.get(
                f"/api/v1/operator/procurements/{self.procurement_a_id}/qr",
                headers=self.op_a_headers,
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["type"], "PROCUREMENT_RECEIPT")
            self.assertIn("<svg", data["svg"])
            self.assertTrue(data["data_url"].startswith("data:image/svg+xml"))
            self.assertEqual(data["theme"]["primary_color"], "#1b5e20")

            # Verify verified payload contains signed procurement details
            decoded = qr_service.verify_and_decode_qr(data["qr_data"])
            self.assertEqual(decoded["type"], "PROCUREMENT_RECEIPT")
            self.assertEqual(decoded["procurement_id"], self.procurement_a_code)
            self.assertEqual(decoded["accepted_quantity"], 14.5)
            self.assertEqual(decoded["amount"], 32987.50)
            self.assertEqual(decoded["status"], "confirmed")

            # Cross-centre Operator B requests receipt -> 403 Forbidden
            resp_b = await client.get(
                f"/api/v1/operator/procurements/{self.procurement_a_id}/qr",
                headers=self.op_b_headers,
            )
            self.assertEqual(resp_b.status_code, 403)

    async def test_public_pass_html(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Unauthenticated call to GET /p/{booking.booking_id} -> 200 OK, text/html
            resp = await client.get(f"/p/{self.booking_a_code}")
            self.assertEqual(resp.status_code, 200)
            self.assertIn("text/html", resp.headers.get("content-type", ""))
            content = resp.text
            self.assertIn("<svg", content)
            self.assertIn(self.booking_a_code, content)
            self.assertIn(self.farmer_a_name, content)
            self.assertIn("Wheat", content)

            # 2. Case-insensitivity check (e.g., lower case booking id)
            resp_lower = await client.get(f"/p/{self.booking_a_code.lower()}")
            self.assertEqual(resp_lower.status_code, 200)

            # 3. Unauthenticated call to GET /p/NONEXISTENT -> 404
            resp_404 = await client.get("/p/NONEXISTENT")
            self.assertEqual(resp_404.status_code, 404)


if __name__ == "__main__":
    unittest.main()
