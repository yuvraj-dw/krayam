import unittest
import uuid
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app


class TestAnalytics(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TA{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_id,
                    "name": f"Analytics Centre {self.test_prefix}",
                    "code": f"AC-{self.test_prefix}",
                },
            )
            await db.commit()

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": self.centre_id})
            await db.commit()
        await engine.dispose()

    async def test_analytics_summary_and_forecast(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            today = date.today()
            # Summary happy path
            resp = await client.get(
                "/api/v1/analytics/summary",
                params={
                    "centre_id": self.centre_id,
                    "from": (today - timedelta(days=7)).isoformat(),
                    "to": today.isoformat(),
                },
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["centre_id"], self.centre_id)
            self.assertIn("farmers_served", data)

            # Summary invalid range (from > to) -> 422 VALIDATION_ERROR
            resp_inv = await client.get(
                "/api/v1/analytics/summary",
                params={
                    "centre_id": self.centre_id,
                    "from": today.isoformat(),
                    "to": (today - timedelta(days=1)).isoformat(),
                },
            )
            self.assertEqual(resp_inv.status_code, 422)

            # Forecast happy path
            resp_fc = await client.get(
                "/api/v1/analytics/forecast",
                params={"centre_id": self.centre_id, "date": today.isoformat()},
            )
            self.assertEqual(resp_fc.status_code, 200)
            fc_data = resp_fc.json()
            self.assertEqual(fc_data["centre_id"], self.centre_id)
            self.assertIn("expected_load_percent", fc_data)


if __name__ == "__main__":
    unittest.main()
