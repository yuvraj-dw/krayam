import unittest
import uuid
from datetime import date

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.operator import operator_service


class TestSync(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TY{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        self.farmer_id = str(uuid.uuid4())
        self.booking_id = str(uuid.uuid4())

        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_id,
                    "name": f"Sync Centre {self.test_prefix}",
                    "code": f"SC-{self.test_prefix}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'Sync Farmer', true, true, now())"
                ),
                {
                    "id": self.farmer_id,
                    "fid": f"F-{self.test_prefix}",
                    "phone": f"+9194{uuid.uuid4().int % 10**8:08d}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO bookings (id, booking_id, farmer_id, centre_id, crop, quantity, unit, expected_date, status, created_at) "
                    "VALUES (:id, :bid, :fid, :cid, 'Wheat', 10.0, 'quintal', :d, 'confirmed', now())"
                ),
                {
                    "id": self.booking_id,
                    "bid": f"BKS-{self.test_prefix}",
                    "fid": self.farmer_id,
                    "cid": self.centre_id,
                    "d": date.today(),
                },
            )
            await db.commit()

            # Create operator
            self.op = await operator_service.register(
                db,
                name="Sync Op",
                phone=f"+9193{uuid.uuid4().int % 10**8:08d}",
                password="SyncPassword@123",
                centre_id=uuid.UUID(self.centre_id),
            )
            await db.commit()

        self.token = operator_service.token_for(self.op)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(
                text("DELETE FROM outbox_events WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM events WHERE entity_id = :bid"), {"bid": self.booking_id}
            )
            await db.execute(
                text(
                    "DELETE FROM payments WHERE procurement_id in (SELECT id FROM procurements WHERE booking_id = :bid)"
                ),
                {"bid": self.booking_id},
            )
            await db.execute(
                text("DELETE FROM procurements WHERE booking_id = :bid"), {"bid": self.booking_id}
            )
            await db.execute(
                text("DELETE FROM queue_entries WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM bookings WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM operators WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": self.centre_id})
            await db.execute(text("DELETE FROM farmers WHERE id = :fid"), {"fid": self.farmer_id})
            await db.commit()
        await engine.dispose()

    async def test_offline_sync_snapshot_pull_and_batch_apply(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Snapshot
            resp_snap = await client.get(
                f"/api/v1/sync/{self.centre_id}/snapshot", headers=self.headers
            )
            self.assertEqual(resp_snap.status_code, 200)
            snap = resp_snap.json()
            self.assertEqual(snap["centre"]["id"], self.centre_id)
            self.assertTrue(any(b["id"] == self.booking_id for b in snap["bookings"]))

            # 2. Batch apply queue check_in event
            client_ev_id = str(uuid.uuid4())
            events_payload = {
                "events": [
                    {
                        "client_event_id": client_ev_id,
                        "type": "queue.check_in",
                        "payload": {"booking_id": self.booking_id},
                    }
                ]
            }
            resp_apply = await client.post(
                f"/api/v1/sync/{self.centre_id}/events", json=events_payload, headers=self.headers
            )
            self.assertEqual(resp_apply.status_code, 200)
            results = resp_apply.json()["results"]
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]["status"], "accepted")

            # 3. Re-submitting the same client_event_id returns duplicate
            resp_dup = await client.post(
                f"/api/v1/sync/{self.centre_id}/events", json=events_payload, headers=self.headers
            )
            self.assertEqual(resp_dup.status_code, 200)
            dup_results = resp_dup.json()["results"]
            self.assertEqual(dup_results[0]["status"], "duplicate")

            # 4. Pull events with cursor
            resp_pull = await client.get(
                f"/api/v1/sync/{self.centre_id}/events", params={"cursor": 0}, headers=self.headers
            )
            self.assertEqual(resp_pull.status_code, 200)
            pulled = resp_pull.json()
            self.assertTrue(len(pulled["events"]) >= 1)


if __name__ == "__main__":
    unittest.main()
