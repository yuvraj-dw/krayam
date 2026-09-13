import logging
import os
import sys
import unittest
import uuid
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

# Ensure repo root is on sys.path for direct script execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.auth import auth_service
from app.services.operator import operator_service

# Reduce database query log verbosity during test runs
engine.echo = False
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


class TestE2ELifecycle(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.phone = "8770578818"
        self.norm_phone = "8770578818"
        self.test_prefix = f"E2E{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        self.slot_id = str(uuid.uuid4())
        self.centre_crop_id = str(uuid.uuid4())
        self.tomorrow = date.today() + timedelta(days=1)

        self.sms_patcher = patch(
            "app.services.sms_gate.SMSGateClient.send_sms",
            new_callable=AsyncMock,
            return_value="mock_msg_id",
        )
        self.sms_patcher.start()

        async with async_session_factory() as db:
            # Wipe any lingering test state for this phone first
            await db.execute(text("DELETE FROM otps WHERE phone = :p"), {"p": self.norm_phone})
            # Wipe sms messages and notifications
            await db.execute(text("DELETE FROM sms_messages WHERE phone = :p"), {"p": self.phone})
            await db.execute(
                text(
                    "DELETE FROM notifications WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p)"
                ),
                {"p": self.phone},
            )
            # Wipe events
            await db.execute(
                text(
                    "DELETE FROM events WHERE entity_id IN ("
                    "SELECT id FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p) "
                    "UNION SELECT id FROM queue_entries WHERE booking_id IN ("
                    "SELECT id FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p)))"
                ),
                {"p": self.phone},
            )
            # Wipe payments
            await db.execute(
                text(
                    "DELETE FROM payments WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p) "
                    "OR procurement_id IN (SELECT id FROM procurements WHERE booking_id IN ("
                    "SELECT id FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p)))"
                ),
                {"p": self.phone},
            )
            # Wipe procurements
            await db.execute(
                text(
                    "DELETE FROM procurements WHERE booking_id IN ("
                    "SELECT id FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p))"
                ),
                {"p": self.phone},
            )
            # Wipe queue entries
            await db.execute(
                text(
                    "DELETE FROM queue_entries WHERE booking_id IN ("
                    "SELECT id FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p))"
                ),
                {"p": self.phone},
            )
            # Wipe outbox events for phone
            await db.execute(
                text(
                    "DELETE FROM outbox_events WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p)"
                ),
                {"p": self.phone},
            )
            # Wipe bookings
            await db.execute(
                text(
                    "DELETE FROM bookings WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p)"
                ),
                {"p": self.phone},
            )
            await db.execute(text("DELETE FROM farmers WHERE phone = :p"), {"p": self.phone})
            await db.commit()

            # Insert Centre A
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_id,
                    "name": f"Centre A {self.test_prefix}",
                    "code": f"CA-{self.test_prefix}",
                },
            )

            # Insert CentreCrop ("Wheat" with rate 2400.0)
            await db.execute(
                text(
                    "INSERT INTO centre_crops (id, centre_id, crop_name, rate_per_unit, unit, is_active) "
                    "VALUES (:id, :cid, 'Wheat', 2400.0, 'quintal', true)"
                ),
                {
                    "id": self.centre_crop_id,
                    "cid": self.centre_id,
                },
            )

            # Insert active Slot for tomorrow
            await db.execute(
                text(
                    "INSERT INTO slots (id, centre_id, date, start_time, end_time, max_bookings, current_bookings, is_available) "
                    "VALUES (:id, :cid, :d, '09:00:00', '10:00:00', 5, 0, true)"
                ),
                {
                    "id": self.slot_id,
                    "cid": self.centre_id,
                    "d": self.tomorrow,
                },
            )
            await db.commit()

            # Create Centre Operator for Centre A
            self.op_phone = f"+9198{uuid.uuid4().int % 10**8:08d}"
            self.op_password = "Password@123"
            self.op = await operator_service.register(
                db,
                name=f"Op {self.test_prefix}",
                phone=self.op_phone,
                password=self.op_password,
                centre_id=uuid.UUID(self.centre_id),
            )
            await db.commit()

        self.operator_token = operator_service.token_for(self.op)
        self.operator_headers = {"Authorization": f"Bearer {self.operator_token}"}

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            # Delete sms messages and notifications for phone or farmer
            await db.execute(
                text("DELETE FROM sms_messages WHERE phone = :p"),
                {"p": self.phone},
            )
            await db.execute(
                text(
                    "DELETE FROM notifications WHERE farmer_id IN (SELECT id FROM farmers WHERE phone = :p)"
                ),
                {"p": self.phone},
            )
            # Delete outbox events for this centre or farmer
            await db.execute(
                text(
                    "DELETE FROM outbox_events WHERE centre_id = :cid OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p)"
                ),
                {"cid": self.centre_id, "p": self.phone},
            )
            # Delete events for bookings or queue entries of this centre or farmer
            await db.execute(
                text(
                    "DELETE FROM events WHERE entity_id IN ("
                    "SELECT id FROM bookings WHERE centre_id = :cid OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p) "
                    "UNION SELECT id FROM queue_entries WHERE centre_id = :cid"
                    ")"
                ),
                {"cid": self.centre_id, "p": self.phone},
            )
            # Delete payments tied to procurements for this centre's or farmer's bookings
            await db.execute(
                text(
                    "DELETE FROM payments WHERE procurement_id IN ("
                    "SELECT id FROM procurements WHERE booking_id IN ("
                    "SELECT id FROM bookings WHERE centre_id = :cid OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p)))"
                ),
                {"cid": self.centre_id, "p": self.phone},
            )
            # Delete procurements
            await db.execute(
                text(
                    "DELETE FROM procurements WHERE booking_id IN ("
                    "SELECT id FROM bookings WHERE centre_id = :cid OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p))"
                ),
                {"cid": self.centre_id, "p": self.phone},
            )
            # Delete queue entries
            await db.execute(
                text(
                    "DELETE FROM queue_entries WHERE centre_id = :cid OR booking_id IN ("
                    "SELECT id FROM bookings WHERE centre_id = :cid OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p))"
                ),
                {"cid": self.centre_id, "p": self.phone},
            )
            # Delete bookings (by centre or farmer)
            await db.execute(
                text(
                    "DELETE FROM bookings WHERE centre_id = :cid OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p)"
                ),
                {"cid": self.centre_id, "p": self.phone},
            )
            # Delete slots
            await db.execute(
                text("DELETE FROM slots WHERE centre_id = :cid"),
                {"cid": self.centre_id},
            )
            # Delete centre crops
            await db.execute(
                text("DELETE FROM centre_crops WHERE centre_id = :cid"),
                {"cid": self.centre_id},
            )
            # Delete operators
            await db.execute(
                text("DELETE FROM operators WHERE centre_id = :cid"),
                {"cid": self.centre_id},
            )
            # Delete centre
            await db.execute(
                text("DELETE FROM centres WHERE id = :cid"),
                {"cid": self.centre_id},
            )
            # Delete farmer and otps
            await db.execute(text("DELETE FROM otps WHERE phone = :p"), {"p": self.norm_phone})
            await db.execute(text("DELETE FROM farmers WHERE phone = :p"), {"p": self.phone})
            await db.commit()
        self.sms_patcher.stop()
        await engine.dispose()

    async def test_e2e_rest_complete_lifecycle(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # -----------------------------------------------------------------
            # Step 1: Auth & Registration
            # -----------------------------------------------------------------
            send_resp = await client.post(
                "/api/v1/auth/otp/send",
                json={"phone": self.phone},
            )
            self.assertEqual(send_resp.status_code, 200)

            # Retrieve OTP from database
            async with async_session_factory() as db:
                row = (
                    await db.execute(
                        text(
                            "SELECT code FROM otps WHERE phone = :p ORDER BY created_at DESC LIMIT 1"
                        ),
                        {"p": self.norm_phone},
                    )
                ).first()
                self.assertIsNotNone(row)
                otp_code = row[0]

            # Verify OTP
            verify_resp = await client.post(
                "/api/v1/auth/otp/verify",
                json={"phone": self.phone, "code": otp_code},
            )
            self.assertEqual(verify_resp.status_code, 200)
            verify_data = verify_resp.json()
            self.assertIn("access_token", verify_data)
            pending_token = verify_data["access_token"]
            pending_headers = {"Authorization": f"Bearer {pending_token}"}

            # Register profile with POST /api/v1/auth/register
            reg_resp = await client.post(
                "/api/v1/auth/register",
                headers=pending_headers,
                json={
                    "name": f"Farmer {self.test_prefix}",
                    "village": "Nashik Rural",
                    "district": "Nashik",
                    "state": "Maharashtra",
                    "pincode": "422001",
                    "latitude": 19.0,
                    "longitude": 74.0,
                },
            )
            self.assertEqual(reg_resp.status_code, 200)
            farmer_profile = reg_resp.json()
            farmer_id = farmer_profile["id"]

            # Farmer login token for subsequent endpoints
            farmer_token = auth_service.create_access_token(farmer_id, role="farmer")
            farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

            # Update profile with PUT /api/v1/farmers/me using farmer token
            profile_resp = await client.put(
                "/api/v1/farmers/me",
                headers=farmer_headers,
                json={
                    "name": f"Farmer {self.test_prefix}",
                    "village": "Nashik Rural",
                    "district": "Nashik",
                    "state": "Maharashtra",
                    "pincode": "422001",
                    "latitude": 19.0,
                    "longitude": 74.0,
                },
            )
            self.assertEqual(profile_resp.status_code, 200)
            profile_data = profile_resp.json()
            self.assertEqual(profile_data["name"], f"Farmer {self.test_prefix}")
            self.assertEqual(profile_data["latitude"], 19.0)
            self.assertEqual(profile_data["longitude"], 74.0)

            # -----------------------------------------------------------------
            # Step 2: Recommendation & Discovery
            # -----------------------------------------------------------------
            recommend_resp = await client.post(
                "/api/v1/bookings/recommend",
                params={"crop": "Wheat", "expected_date": str(self.tomorrow)},
                json={
                    "crop": "Wheat",
                    "quantity": 20.0,
                    "expected_date": str(self.tomorrow),
                    "latitude": 19.0,
                    "longitude": 74.0,
                },
                headers=farmer_headers,
            )
            self.assertEqual(recommend_resp.status_code, 200)
            rec_list = recommend_resp.json()
            self.assertIsInstance(rec_list, list)
            rec_ids = [r["centre"]["id"] for r in rec_list]
            self.assertIn(self.centre_id, rec_ids)

            # Discover available slots
            slots_resp = await client.get(
                "/api/v1/slots",
                params={"centre_id": self.centre_id, "on_date": str(self.tomorrow)},
            )
            self.assertEqual(slots_resp.status_code, 200)
            slots = slots_resp.json()
            self.assertGreaterEqual(len(slots), 1)
            self.assertEqual(slots[0]["id"], self.slot_id)

            # -----------------------------------------------------------------
            # Step 3: Booking & QR Gate Pass
            # -----------------------------------------------------------------
            booking_payload = {
                "centre_id": self.centre_id,
                "slot_id": self.slot_id,
                "crop": "Wheat",
                "quantity": 20.0,
                "unit": "quintal",
                "expected_date": str(self.tomorrow),
            }
            booking_resp = await client.post(
                "/api/v1/bookings",
                headers=farmer_headers,
                json=booking_payload,
            )
            self.assertEqual(booking_resp.status_code, 201)
            booking_data = booking_resp.json()
            booking_id = booking_data["id"]
            booking_code = booking_data["booking_id"]
            self.assertEqual(booking_data["crop"], "Wheat")
            self.assertEqual(booking_data["quantity"], 20.0)

            # Farmer retrieves QR gate pass
            qr_resp = await client.get(
                f"/api/v1/bookings/{booking_id}/qr",
                headers=farmer_headers,
            )
            self.assertEqual(qr_resp.status_code, 200)
            qr_data = qr_resp.json()
            self.assertIn("svg", qr_data)
            self.assertIn("<svg", qr_data["svg"])
            self.assertIn("qr_data", qr_data)
            self.assertIn("sig", qr_data["qr_data"])

            # Public gate pass view via short link /p/{booking_code}
            public_pass_resp = await client.get(f"/p/{booking_code}")
            self.assertEqual(public_pass_resp.status_code, 200)
            self.assertIn("text/html", public_pass_resp.headers["content-type"])
            self.assertIn("<svg", public_pass_resp.text)
            self.assertIn(booking_code, public_pass_resp.text)

            # -----------------------------------------------------------------
            # Step 4: Arrival & Gate Pass Scan
            # -----------------------------------------------------------------
            scan_resp = await client.post(
                "/api/v1/operator/check-in/scan",
                headers=self.operator_headers,
                json={"qr_payload": qr_data["qr_data"]},
            )
            self.assertEqual(scan_resp.status_code, 200)
            queue_data = scan_resp.json()
            self.assertEqual(queue_data["booking_id"], booking_id)
            self.assertEqual(queue_data["position"], 1)
            self.assertEqual(queue_data["status"], "waiting")
            queue_entry_id = queue_data["id"]

            # -----------------------------------------------------------------
            # Step 5: Operator Processing & Intake
            # -----------------------------------------------------------------
            call_next_resp = await client.post(
                "/api/v1/operator/call-next",
                headers=self.operator_headers,
            )
            self.assertEqual(call_next_resp.status_code, 200)
            called_entry = call_next_resp.json()
            self.assertEqual(called_entry["id"], queue_entry_id)
            self.assertEqual(called_entry["status"], "called")

            start_resp = await client.post(
                f"/api/v1/operator/queue/{queue_entry_id}/start",
                headers=self.operator_headers,
            )
            self.assertEqual(start_resp.status_code, 200)
            self.assertEqual(start_resp.json()["status"], "processing")

            # Record produce procurement
            proc_resp = await client.post(
                "/api/v1/operator/procurements",
                headers=self.operator_headers,
                json={
                    "booking_id": booking_id,
                    "accepted_quantity": 19.5,
                    "unit": "quintal",
                    "quality_notes": "Grade A Wheat verified",
                },
            )
            self.assertEqual(proc_resp.status_code, 201)
            proc_data = proc_resp.json()
            procurement_id = proc_data["id"]
            self.assertEqual(proc_data["accepted_quantity"], 19.5)

            # Complete queue entry processing
            complete_resp = await client.post(
                f"/api/v1/operator/queue/{queue_entry_id}/complete",
                headers=self.operator_headers,
            )
            self.assertEqual(complete_resp.status_code, 200)
            self.assertEqual(complete_resp.json()["status"], "completed")

            # -----------------------------------------------------------------
            # Step 6: Financial Settlement
            # -----------------------------------------------------------------
            init_pmt_resp = await client.post(
                f"/api/v1/operator/procurements/{procurement_id}/payment",
                headers=self.operator_headers,
            )
            self.assertEqual(init_pmt_resp.status_code, 200)
            pmt_data = init_pmt_resp.json()
            payment_id = pmt_data["id"]
            self.assertEqual(pmt_data["quantity"], 19.5)
            self.assertEqual(pmt_data["rate"], 2400.0)
            self.assertEqual(pmt_data["amount"], 19.5 * 2400.0)
            self.assertEqual(pmt_data["status"], "initiated")

            # Operator reviews payment info with anomaly detector checks
            review_resp = await client.get(
                f"/api/v1/operator/procurements/{procurement_id}/review",
                headers=self.operator_headers,
            )
            self.assertEqual(review_resp.status_code, 200)
            review_data = review_resp.json()
            self.assertEqual(review_data["accepted_quantity"], 19.5)
            self.assertEqual(review_data["rate"], 2400.0)
            self.assertEqual(review_data["amount"], 46800.0)
            self.assertIn("anomaly_flags", review_data)
            self.assertIsInstance(review_data["anomaly_flags"], list)

            # Operator verifies/confirms payment
            confirm_resp = await client.post(
                f"/api/v1/operator/payments/{payment_id}/verify",
                headers=self.operator_headers,
                json={"confirmed": True, "verified_by": "Operator Lead"},
            )
            self.assertEqual(confirm_resp.status_code, 200)
            self.assertEqual(confirm_resp.json()["status"], "confirmed")
            self.assertEqual(confirm_resp.json()["verified_by"], "Operator Lead")

            # -----------------------------------------------------------------
            # Step 7: In-App Notifications
            # -----------------------------------------------------------------
            notif_resp = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=farmer_headers,
            )
            self.assertEqual(notif_resp.status_code, 200)
            notif_data = notif_resp.json()
            self.assertGreaterEqual(notif_data["total"], 1)
            self.assertGreaterEqual(notif_data["unread_count"], 1)

            # Mark all notifications as read
            read_all_resp = await client.post(
                "/api/v1/farmers/me/notifications/read-all",
                headers=farmer_headers,
            )
            self.assertEqual(read_all_resp.status_code, 200)
            self.assertGreaterEqual(read_all_resp.json()["updated"], 1)

            # Verify unread_count is now 0
            notif_resp2 = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=farmer_headers,
            )
            self.assertEqual(notif_resp2.status_code, 200)
            self.assertEqual(notif_resp2.json()["unread_count"], 0)

            # -----------------------------------------------------------------
            # Step 8: Operator Dashboard & Analytics
            # -----------------------------------------------------------------
            dashboard_resp = await client.get(
                "/api/v1/operator/dashboard",
                headers=self.operator_headers,
            )
            self.assertEqual(dashboard_resp.status_code, 200)
            dash_data = dashboard_resp.json()
            self.assertIn("queue", dash_data)
            self.assertIn("procurement", dash_data)

            # Analytics query
            today_str = str(date.today())
            tomorrow_str = str(self.tomorrow)
            analytics_resp = await client.get(
                f"/api/v1/operator/analytics?from={today_str}&to={tomorrow_str}",
                headers=self.operator_headers,
            )
            self.assertEqual(analytics_resp.status_code, 200)
            analytics_data = analytics_resp.json()
            self.assertGreaterEqual(analytics_data["farmers_served"], 1)
            self.assertGreaterEqual(analytics_data["total_quantity_procured"], 19.5)


if __name__ == "__main__":
    unittest.main()
