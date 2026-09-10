import unittest
import uuid

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app


class TestCentres(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TC{uuid.uuid4().hex[:6].upper()}"
        self.centre_ids: list[str] = []

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            for cid in self.centre_ids:
                await db.execute(
                    text("DELETE FROM centre_crops WHERE centre_id = :cid"), {"cid": cid}
                )
                await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": cid})
            await db.commit()
        await engine.dispose()

    async def test_centre_crud_and_crops(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Create centre
            code = f"{self.test_prefix}-C1"
            create_payload = {
                "name": f"Test Centre {self.test_prefix}",
                "code": code,
                "district": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
                "latitude": 18.5204,
                "longitude": 73.8567,
                "capacity": 50,
            }
            resp = await client.post("/api/v1/centres", json=create_payload)
            self.assertEqual(resp.status_code, 201)
            centre_data = resp.json()
            cid = centre_data["id"]
            self.centre_ids.append(cid)
            self.assertEqual(centre_data["code"], code)

            # 2. Get centre
            resp_get = await client.get(f"/api/v1/centres/{cid}")
            self.assertEqual(resp_get.status_code, 200)
            self.assertEqual(resp_get.json()["name"], create_payload["name"])

            # 3. Add crop to centre
            crop_payload = {
                "crop_name": "Wheat",
                "rate_per_unit": 2275.0,
                "unit": "quintal",
            }
            resp_crop = await client.post(f"/api/v1/centres/{cid}/crops", json=crop_payload)
            self.assertEqual(resp_crop.status_code, 201)
            self.assertEqual(resp_crop.json()["crop_name"], "Wheat")

            # 4. Conflict on duplicate crop
            resp_dup = await client.post(f"/api/v1/centres/{cid}/crops", json=crop_payload)
            self.assertEqual(resp_dup.status_code, 409)

            # 5. List centres filtering by crop
            resp_list = await client.get("/api/v1/centres", params={"crop": "Wheat"})
            self.assertEqual(resp_list.status_code, 200)
            matches = [c for c in resp_list.json() if c["id"] == cid]
            self.assertEqual(len(matches), 1)

    async def test_add_crop_nonexistent_centre_404_regression(self) -> None:
        """Regression test for Fix 4: must return 404 NOT_FOUND, not 500 DB FK error."""
        non_existent_id = str(uuid.uuid4())
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                f"/api/v1/centres/{non_existent_id}/crops",
                json={"crop_name": "Soybean", "rate_per_unit": 4500.0, "unit": "quintal"},
            )
            self.assertEqual(resp.status_code, 404)
            self.assertEqual(resp.json()["error"]["code"], "NOT_FOUND")


if __name__ == "__main__":
    unittest.main()
