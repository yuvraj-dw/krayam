import unittest
import uuid
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.bus import bus


class TestSMSWebhook(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TS{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        self.farmer_id = str(uuid.uuid4())
        self.booking_id = str(uuid.uuid4())
        self.phone = f"95{uuid.uuid4().int % 10**8:08d}"
        self.tomorrow = date.today() + timedelta(days=1)
        self.booking_code = f"BK-{self.test_prefix}"

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
                    "VALUES (:id, :fid, :phone, 'SMS Farmer', true, true, now())"
                ),
                {"id": self.farmer_id, "fid": f"F-{self.test_prefix}", "phone": self.phone},
            )
            await db.execute(
                text(
                    "INSERT INTO bookings (id, booking_id, farmer_id, centre_id, crop, quantity, unit, expected_date, status, created_at) "
                    "VALUES (:id, :bid, :fid, :cid, 'Wheat', 10.0, 'quintal', :d, 'confirmed', now())"
                ),
                {
                    "id": self.booking_id,
                    "bid": self.booking_code,
                    "fid": self.farmer_id,
                    "cid": self.centre_id,
                    "d": self.tomorrow,
                },
            )
            await db.commit()

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(text("DELETE FROM sms_messages WHERE phone = :p"), {"p": self.phone})
            await db.execute(text("DELETE FROM sms_sessions WHERE phone = :p"), {"p": self.phone})
            await db.execute(
                text("DELETE FROM outbox_events WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(
                text("DELETE FROM bookings WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": self.centre_id})
            await db.execute(text("DELETE FROM farmers WHERE id = :fid"), {"fid": self.farmer_id})
            await db.commit()
        await engine.dispose()

    async def test_sms_help_and_status(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Send HELP
            payload = {
                "event": "sms:received",
                "payload": {
                    "messageId": str(uuid.uuid4()),
                    "sender": self.phone,
                    "message": "HELP",
                },
            }
            resp = await client.post("/sms/incoming", json=payload)
            self.assertEqual(resp.status_code, 200)

            # Duplicate messageId -> returns status: duplicate
            resp_dup = await client.post("/sms/incoming", json=payload)
            self.assertEqual(resp_dup.status_code, 200)
            self.assertEqual(resp_dup.json(), {"status": "duplicate"})

            # Send STATUS
            status_payload = {
                "event": "sms:received",
                "payload": {
                    "messageId": str(uuid.uuid4()),
                    "sender": self.phone,
                    "message": "STATUS",
                },
            }
            resp_status = await client.post("/sms/incoming", json=status_payload)
            self.assertEqual(resp_status.status_code, 200)

    async def test_sms_global_cancel_and_help_during_active_conversation(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Start a booking conversation to enter bk_crop state
            resp = await client.post(
                "/sms/incoming",
                json={
                    "event": "sms:received",
                    "payload": {
                        "messageId": str(uuid.uuid4()),
                        "sender": self.phone,
                        "message": "BOOK",
                    },
                },
            )
            self.assertEqual(resp.status_code, 200)

            # Verify session is now in bk_crop state
            async with async_session_factory() as db:
                sess = (
                    await db.execute(
                        text("SELECT state, context FROM sms_sessions WHERE phone = :p"),
                        {"p": self.phone},
                    )
                ).first()
                self.assertIsNotNone(sess)
                self.assertEqual(sess[0], "bk_crop")

            # 2. Send HELP during active conversation -> state and context preserved
            resp_help = await client.post(
                "/sms/incoming",
                json={
                    "event": "sms:received",
                    "payload": {
                        "messageId": str(uuid.uuid4()),
                        "sender": self.phone,
                        "message": "HELP",
                    },
                },
            )
            self.assertEqual(resp_help.status_code, 200)

            # Check outgoing message for HELP text and verify session state is STILL bk_crop
            async with async_session_factory() as db:
                msg = (
                    await db.execute(
                        text(
                            "SELECT content FROM sms_messages WHERE phone = :p AND direction = 'outgoing' "
                            "ORDER BY created_at DESC LIMIT 1"
                        ),
                        {"p": self.phone},
                    )
                ).first()
                self.assertIsNotNone(msg)
                self.assertIn("Available commands:", msg[0])
                self.assertIn("CANCEL - Cancel a booking or conversation", msg[0])

                sess = (
                    await db.execute(
                        text("SELECT state FROM sms_sessions WHERE phone = :p"),
                        {"p": self.phone},
                    )
                ).first()
                self.assertEqual(sess[0], "bk_crop")

            # 3. Send CANCEL during active conversation -> session reset to idle
            resp_cancel = await client.post(
                "/sms/incoming",
                json={
                    "event": "sms:received",
                    "payload": {
                        "messageId": str(uuid.uuid4()),
                        "sender": self.phone,
                        "message": "CANCEL",
                    },
                },
            )
            self.assertEqual(resp_cancel.status_code, 200)

            async with async_session_factory() as db:
                msg = (
                    await db.execute(
                        text(
                            "SELECT content FROM sms_messages WHERE phone = :p AND direction = 'outgoing' "
                            "ORDER BY created_at DESC LIMIT 1"
                        ),
                        {"p": self.phone},
                    )
                ).first()
                self.assertIsNotNone(msg)
                self.assertEqual(
                    msg[0],
                    "Your current conversation has been cancelled. Send HI to start again.",
                )

                sess = (
                    await db.execute(
                        text("SELECT state, context FROM sms_sessions WHERE phone = :p"),
                        {"p": self.phone},
                    )
                ).first()
                self.assertEqual(sess[0], "idle")
                self.assertEqual(sess[1], {})

    async def test_sms_greeting_registered_and_unregistered(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Registered farmer greeting (self.phone is registered as "SMS Farmer")
            resp = await client.post(
                "/sms/incoming",
                json={
                    "event": "sms:received",
                    "payload": {
                        "messageId": str(uuid.uuid4()),
                        "sender": self.phone,
                        "message": "HI",
                    },
                },
            )
            self.assertEqual(resp.status_code, 200)
            async with async_session_factory() as db:
                msg = (
                    await db.execute(
                        text(
                            "SELECT content FROM sms_messages WHERE phone = :p AND direction = 'outgoing' "
                            "ORDER BY created_at DESC LIMIT 1"
                        ),
                        {"p": self.phone},
                    )
                ).first()
                self.assertIsNotNone(msg)
                self.assertIn("Namaste SMS Farmer! Welcome to Krayam.", msg[0])
                self.assertIn("- BOOK: Book a crop procurement slot", msg[0])

            # 2. Unregistered farmer greeting
            unregistered_phone = f"94{uuid.uuid4().int % 10**8:08d}"
            try:
                resp_unreg = await client.post(
                    "/sms/incoming",
                    json={
                        "event": "sms:received",
                        "payload": {
                            "messageId": str(uuid.uuid4()),
                            "sender": unregistered_phone,
                            "message": "namaste",
                        },
                    },
                )
                self.assertEqual(resp_unreg.status_code, 200)
                async with async_session_factory() as db:
                    msg = (
                        await db.execute(
                            text(
                                "SELECT content FROM sms_messages WHERE phone = :p AND direction = 'outgoing' "
                                "ORDER BY created_at DESC LIMIT 1"
                            ),
                            {"p": unregistered_phone},
                        )
                    ).first()
                    self.assertIsNotNone(msg)
                    self.assertIn("Welcome to Krayam Procurement Platform.", msg[0])
                    self.assertIn("- Send REGISTER to create an account", msg[0])
                    self.assertIn("- Send HELP to see available commands and instructions", msg[0])
            finally:
                async with async_session_factory() as db:
                    await db.execute(
                        text("DELETE FROM sms_messages WHERE phone = :p"), {"p": unregistered_phone}
                    )
                    await db.execute(
                        text("DELETE FROM sms_sessions WHERE phone = :p"), {"p": unregistered_phone}
                    )
                    await db.commit()

    async def test_sms_cancel_triggers_live_outbox_publish_regression(self) -> None:
        """Regression test for Fix 6: SMS booking cancellation must publish event to live SSE bus."""
        # Subscribe to centre events on bus
        scope = f"centre:{self.centre_id}"
        queue = await bus.subscribe(scope)
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                cancel_payload = {
                    "event": "sms:received",
                    "payload": {
                        "messageId": str(uuid.uuid4()),
                        "sender": self.phone,
                        "message": f"CANCEL {self.booking_code}",
                    },
                }
                resp = await client.post("/sms/incoming", json=cancel_payload)
                self.assertEqual(resp.status_code, 200)

                # Verify booking is cancelled in DB
                async with async_session_factory() as db:
                    row = (
                        await db.execute(
                            text("SELECT status FROM bookings WHERE id = :id"),
                            {"id": self.booking_id},
                        )
                    ).first()
                    self.assertIsNotNone(row)
                    self.assertEqual(row[0], "cancelled")

                # Verify live bus received the event immediately without delay
                received = await queue.get()
                self.assertEqual(received["event_type"], "booking.cancelled")
                self.assertEqual(received["data"]["booking_id"], self.booking_code)
        finally:
            await bus.unsubscribe(scope, queue)


if __name__ == "__main__":
    unittest.main()
