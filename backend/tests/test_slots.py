import unittest
import uuid
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.slot import slot_service


class TestSlots(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TS{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_id,
                    "name": f"Slot Test {self.test_prefix}",
                    "code": f"SL-{self.test_prefix}",
                },
            )
            await db.commit()

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(
                text("DELETE FROM bookings WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM slots WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": self.centre_id})
            await db.commit()
        await engine.dispose()

    async def test_slot_creation_and_availability(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            tomorrow = date.today() + timedelta(days=1)
            payload = {
                "centre_id": self.centre_id,
                "date": tomorrow.isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "max_bookings": 2,
            }
            resp = await client.post("/api/v1/slots", json=payload)
            self.assertEqual(resp.status_code, 201)
            # Duplicate slot conflict
            resp_dup = await client.post("/api/v1/slots", json=payload)
            self.assertEqual(resp_dup.status_code, 409)

            # List slots
            resp_list = await client.get(
                "/api/v1/slots",
                params={"centre_id": self.centre_id, "on_date": tomorrow.isoformat()},
            )
            self.assertEqual(resp_list.status_code, 200)
            self.assertEqual(len(resp_list.json()), 1)

    async def test_slot_refresh_on_full_slots_regression(self) -> None:
        """Regression test for Fix 3A: when a full slot is refreshed, it must not be skipped."""
        tomorrow = date.today() + timedelta(days=2)
        async with async_session_factory() as db:
            slot_id = str(uuid.uuid4())
            await db.execute(
                text(
                    "INSERT INTO slots (id, centre_id, date, start_time, end_time, max_bookings, current_bookings, is_available) "
                    "VALUES (:id, :cid, :d, '14:00:00', '15:00:00', 2, 2, false)"
                ),
                {"id": slot_id, "cid": self.centre_id, "d": tomorrow},
            )
            await db.commit()

            # Slot is currently is_available = False, current_bookings = 2
            # Now call refresh_availability (no bookings exist in bookings table)
            await slot_service.refresh_availability(db, uuid.UUID(self.centre_id))
            await db.commit()

            # Verify slot was restored to is_available = True, current_bookings = 0
            row = (
                await db.execute(
                    text("SELECT is_available, current_bookings FROM slots WHERE id = :id"),
                    {"id": slot_id},
                )
            ).first()
            self.assertIsNotNone(row)
            self.assertTrue(
                row[0], "Slot must become available again when count drops below max_bookings"
            )
            self.assertEqual(row[1], 0)


if __name__ == "__main__":
    unittest.main()
