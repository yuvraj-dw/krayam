import logging
import os
import sys
import unittest
import uuid
from datetime import date

# Ensure repo root is on sys.path for direct script execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
from sqlalchemy import select, text

from app.database import async_session_factory, engine
from app.main import app
from app.models.notification import Notification
from app.services.auth import auth_service
from app.services.notification import _record_notification, notification_service

# Reduce database query log verbosity during test runs
engine.echo = False
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


class TestNotifications(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TN{uuid.uuid4().hex[:6].upper()}"
        self.farmer_a_id = str(uuid.uuid4())
        self.farmer_b_id = str(uuid.uuid4())
        self.phone_a = f"+9193{uuid.uuid4().int % 10**8:08d}"
        self.phone_b = f"+9194{uuid.uuid4().int % 10**8:08d}"

        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'Farmer A', true, true, now())"
                ),
                {
                    "id": self.farmer_a_id,
                    "fid": f"FA-{self.test_prefix}",
                    "phone": self.phone_a,
                },
            )
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'Farmer B', true, true, now())"
                ),
                {
                    "id": self.farmer_b_id,
                    "fid": f"FB-{self.test_prefix}",
                    "phone": self.phone_b,
                },
            )
            await db.commit()

        self.farmer_token = auth_service.create_access_token(self.farmer_a_id, role="farmer")
        self.farmer_headers = {"Authorization": f"Bearer {self.farmer_token}"}

        self.farmer_b_token = auth_service.create_access_token(self.farmer_b_id, role="farmer")
        self.farmer_b_headers = {"Authorization": f"Bearer {self.farmer_b_token}"}

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            # Notifications cascade-delete on farmer deletion, but clean up explicitly
            await db.execute(
                text("DELETE FROM notifications WHERE farmer_id IN (:fa, :fb)"),
                {"fa": self.farmer_a_id, "fb": self.farmer_b_id},
            )
            await db.execute(
                text("DELETE FROM sms_messages WHERE phone IN (:pa, :pb)"),
                {"pa": self.phone_a, "pb": self.phone_b},
            )
            await db.execute(
                text("DELETE FROM farmers WHERE id IN (:fa, :fb)"),
                {"fa": self.farmer_a_id, "fb": self.farmer_b_id},
            )
            await db.commit()
        await engine.dispose()

    async def test_notifications_auth(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Calling without auth -> 401/403
            resp_no_auth = await client.get("/api/v1/farmers/me/notifications")
            self.assertIn(resp_no_auth.status_code, [401, 403])

            # Operator token -> 401/403 (Farmer role expected)
            op_token = auth_service.create_access_token(str(uuid.uuid4()), role="operator")
            resp_wrong_role = await client.get(
                "/api/v1/farmers/me/notifications",
                headers={"Authorization": f"Bearer {op_token}"},
            )
            self.assertIn(resp_wrong_role.status_code, [401, 403])

            # Authenticated farmer -> 200
            resp_auth = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_auth.status_code, 200)
            data = resp_auth.json()
            self.assertIn("items", data)
            self.assertIn("total", data)
            self.assertIn("unread_count", data)

    async def test_notification_lifecycle_persistence(self) -> None:
        # Trigger notification via notify_booking_confirmed
        class DummyFarmer:
            id = uuid.UUID(self.farmer_a_id)
            phone = self.phone_a

        class DummyBooking:
            farmer_id = uuid.UUID(self.farmer_a_id)
            crop = "wheat"
            quantity = 25.0
            unit = "quintal"
            booking_id = f"BK-{self.test_prefix}"
            expected_date = date.today()
            centre_id = None

        async with async_session_factory() as db:
            await notification_service.notify_booking_confirmed(
                db, DummyBooking(), DummyFarmer()
            )
            await db.commit()

        # Verify notification was persisted in the DB
        async with async_session_factory() as db:
            stmt = select(Notification).where(
                Notification.farmer_id == uuid.UUID(self.farmer_a_id),
                Notification.event_type == "BOOKING_CONFIRMED",
            )
            res = await db.execute(stmt)
            persisted = res.scalar_one_or_none()
            self.assertIsNotNone(persisted)
            self.assertFalse(persisted.is_read)
            self.assertEqual(persisted.title, "Booking Confirmed")

        # Call GET /api/v1/farmers/me/notifications
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertGreaterEqual(data["total"], 1)
            self.assertGreaterEqual(data["unread_count"], 1)

            event_types = [item["event_type"] for item in data["items"]]
            self.assertIn("BOOKING_CONFIRMED", event_types)

            # Test filter ?is_read=false
            resp_unread = await client.get(
                "/api/v1/farmers/me/notifications?is_read=false",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_unread.status_code, 200)
            self.assertGreaterEqual(resp_unread.json()["total"], 1)

            # Test filter ?is_read=true
            resp_read = await client.get(
                "/api/v1/farmers/me/notifications?is_read=true",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_read.status_code, 200)
            self.assertEqual(resp_read.json()["total"], 0)

    async def test_notification_mark_read_and_read_all(self) -> None:
        # Create 2 notifications for Farmer A
        async with async_session_factory() as db:
            await _record_notification(
                db,
                farmer_id=uuid.UUID(self.farmer_a_id),
                phone=self.phone_a,
                event_type="PAYMENT_INITIATED",
                title="Payment Initiated",
                message="Payment test 1",
            )
            await _record_notification(
                db,
                farmer_id=uuid.UUID(self.farmer_a_id),
                phone=self.phone_a,
                event_type="PAYMENT_CONFIRMED",
                title="Payment Confirmed",
                message="Payment test 2",
            )
            await db.commit()

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Check initial unread count
            resp_init = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_init.status_code, 200)
            data_init = resp_init.json()
            self.assertGreaterEqual(data_init["unread_count"], 2)
            first_notif_id = data_init["items"][0]["id"]

            # Mark one notification as read
            resp_patch = await client.patch(
                f"/api/v1/farmers/me/notifications/{first_notif_id}/read",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_patch.status_code, 200)
            patched_data = resp_patch.json()
            self.assertTrue(patched_data["is_read"])
            self.assertEqual(patched_data["id"], first_notif_id)

            # Verify updated unread_count is 1 less
            resp_after_patch = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_after_patch.status_code, 200)
            self.assertEqual(
                resp_after_patch.json()["unread_count"],
                data_init["unread_count"] - 1,
            )

            # Call read-all
            resp_read_all = await client.post(
                "/api/v1/farmers/me/notifications/read-all",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_read_all.status_code, 200)
            self.assertGreaterEqual(resp_read_all.json()["updated"], 1)

            # Verify unread_count is now 0
            resp_final = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_final.status_code, 200)
            self.assertEqual(resp_final.json()["unread_count"], 0)

    async def test_notifications_isolation(self) -> None:
        # Create a notification for Farmer A
        async with async_session_factory() as db:
            await _record_notification(
                db,
                farmer_id=uuid.UUID(self.farmer_a_id),
                phone=self.phone_a,
                event_type="BOOKING_CANCELLED",
                title="Cancelled for A",
                message="Farmer A cancelled booking",
            )
            await db.commit()

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Farmer A gets the notification
            resp_a = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_headers,
            )
            self.assertEqual(resp_a.status_code, 200)
            data_a = resp_a.json()
            self.assertGreaterEqual(data_a["total"], 1)
            notif_a_id = data_a["items"][0]["id"]

            # Farmer B cannot view Farmer A's notification
            resp_b = await client.get(
                "/api/v1/farmers/me/notifications",
                headers=self.farmer_b_headers,
            )
            self.assertEqual(resp_b.status_code, 200)
            data_b = resp_b.json()
            self.assertEqual(data_b["total"], 0)
            self.assertEqual(data_b["unread_count"], 0)

            # Farmer B attempting to mark Farmer A's notification as read -> 404
            resp_b_patch = await client.patch(
                f"/api/v1/farmers/me/notifications/{notif_a_id}/read",
                headers=self.farmer_b_headers,
            )
            self.assertEqual(resp_b_patch.status_code, 404)


if __name__ == "__main__":
    unittest.main()
