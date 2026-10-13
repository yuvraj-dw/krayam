import unittest
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from seed_data import clean_and_seed
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
                    text(
                        "SELECT name, phone, village, district, state, pincode, is_verified, is_active "
                        "FROM farmers WHERE phone = '9876543200'"
                    )
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
            self.assertTrue(data.get("is_registered"))

            # Verify profile of authenticated demo farmer
            me_resp = await client.get(
                "/api/v1/farmers/me",
                headers={"Authorization": f"Bearer {data['access_token']}"},
            )
            self.assertEqual(me_resp.status_code, 200)
            me_data = me_resp.json()
            self.assertEqual(me_data["name"], "Ramesh Patel")
            self.assertEqual(me_data["phone"], "9876543200")

            resp_pass = await client.get("/p/BK-DEMO-UPCOMING")
            self.assertEqual(resp_pass.status_code, 200)

            resp_rcpt = await client.get("/r/PAY-DEMO-PAST")
            self.assertEqual(resp_rcpt.status_code, 200)

        # Run again to ensure idempotency and prevent slot counter drift
        second_result = await seed_demo_farmer()
        self.assertEqual(second_result["phone"], "9876543200")

        async with async_session_factory() as db:
            slot_cnt = await db.scalar(
                text(
                    "SELECT current_bookings FROM slots "
                    "WHERE centre_id = :cid AND date = :dt AND start_time = '10:00:00'"
                ),
                {
                    "cid": "11111111-1111-1111-1111-111111111111",
                    "dt": date.today() + timedelta(days=1),
                },
            )
            self.assertEqual(slot_cnt, 1)

    async def test_clean_and_seed_includes_demo_farmer(self) -> None:
        await clean_and_seed()
        async with async_session_factory() as db:
            farmer_row = (
                await db.execute(
                    text("SELECT name, phone FROM farmers WHERE phone = '9876543200'")
                )
            ).first()
            self.assertIsNotNone(farmer_row)
            self.assertEqual(farmer_row[0], "Ramesh Patel")
            self.assertEqual(farmer_row[1], "9876543200")

            upcoming = (
                await db.execute(
                    text("SELECT booking_id FROM bookings WHERE booking_id = 'BK-DEMO-UPCOMING'")
                )
            ).first()
            self.assertIsNotNone(upcoming)
