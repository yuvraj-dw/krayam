import unittest
import uuid
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.auth import auth_service


class TestBookings(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TB{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        self.farmer_id = str(uuid.uuid4())
        self.slot_id = str(uuid.uuid4())
        self.tomorrow = date.today() + timedelta(days=1)

        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_id,
                    "name": f"Centre {self.test_prefix}",
                    "code": f"C-{self.test_prefix}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'Test Farmer', true, true, now())"
                ),
                {
                    "id": self.farmer_id,
                    "fid": f"F-{self.test_prefix}",
                    "phone": f"+9198{uuid.uuid4().int % 10**8:08d}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO slots (id, centre_id, date, start_time, end_time, max_bookings, current_bookings, is_available) "
                    "VALUES (:id, :cid, :d, '09:00:00', '10:00:00', 1, 0, true)"
                ),
                {"id": self.slot_id, "cid": self.centre_id, "d": self.tomorrow},
            )
            await db.commit()

        self.token = auth_service.create_access_token(self.farmer_id, role="farmer")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(
                text("DELETE FROM outbox_events WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM bookings WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM slots WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": self.centre_id})
            await db.execute(text("DELETE FROM farmers WHERE id = :fid"), {"fid": self.farmer_id})
            await db.commit()
        await engine.dispose()

    async def test_booking_lifecycle_and_slot_overcapacity_regression(self) -> None:
        """Regression test for Fix 3B: booking creation must increment slot count, preventing overcapacity."""
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. First booking takes the only slot (max_bookings=1)
            create_payload = {
                "crop": "Wheat",
                "quantity": 10.0,
                "unit": "quintal",
                "expected_date": self.tomorrow.isoformat(),
                "centre_id": self.centre_id,
                "slot_id": self.slot_id,
            }
            resp = await client.post("/api/v1/bookings", json=create_payload, headers=self.headers)
            self.assertEqual(resp.status_code, 201)
            booking_id = resp.json()["id"]

            # Verify slot current_bookings is now 1 and is_available is False
            async with async_session_factory() as db:
                row = (
                    await db.execute(
                        text("SELECT current_bookings, is_available FROM slots WHERE id = :id"),
                        {"id": self.slot_id},
                    )
                ).first()
                self.assertIsNotNone(row)
                self.assertEqual(row[0], 1)
                self.assertFalse(row[1])

            # 2. Second booking attempts to take the same slot -> must fail with 422 VALIDATION_ERROR
            resp_overflow = await client.post(
                "/api/v1/bookings", json=create_payload, headers=self.headers
            )
            self.assertEqual(resp_overflow.status_code, 422)

            # 3. Cancel booking -> slot must become available again
            resp_cancel = await client.post(
                f"/api/v1/bookings/{booking_id}/cancel", headers=self.headers
            )
            self.assertEqual(resp_cancel.status_code, 200)
            self.assertEqual(resp_cancel.json()["status"], "cancelled")

            async with async_session_factory() as db:
                row = (
                    await db.execute(
                        text("SELECT current_bookings, is_available FROM slots WHERE id = :id"),
                        {"id": self.slot_id},
                    )
                ).first()
                self.assertIsNotNone(row)
                self.assertEqual(row[0], 0)
                self.assertTrue(row[1])


if __name__ == "__main__":
    unittest.main()
