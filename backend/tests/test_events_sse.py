import unittest
import uuid

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.auth import auth_service
from app.services.operator import operator_service


class TestEventsSSE(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.test_prefix = f"TE{uuid.uuid4().hex[:6].upper()}"
        self.centre_id = str(uuid.uuid4())
        self.farmer_id = str(uuid.uuid4())

        async with async_session_factory() as db:
            await db.execute(
                text(
                    "INSERT INTO centres (id, name, code, latitude, longitude, capacity, is_active, created_at) "
                    "VALUES (:id, :name, :code, 19.0, 74.0, 50, true, now())"
                ),
                {
                    "id": self.centre_id,
                    "name": f"SSE Centre {self.test_prefix}",
                    "code": f"EC-{self.test_prefix}",
                },
            )
            await db.execute(
                text(
                    "INSERT INTO farmers (id, farmer_id, phone, name, is_active, is_verified, created_at) "
                    "VALUES (:id, :fid, :phone, 'SSE Farmer', true, true, now())"
                ),
                {
                    "id": self.farmer_id,
                    "fid": f"F-{self.test_prefix}",
                    "phone": f"+9192{uuid.uuid4().int % 10**8:08d}",
                },
            )
            await db.commit()

            self.op = await operator_service.register(
                db,
                name="SSE Op",
                phone=f"+9191{uuid.uuid4().int % 10**8:08d}",
                password="SSEPassword@123",
                centre_id=uuid.UUID(self.centre_id),
            )
            await db.commit()

        self.op_token = operator_service.token_for(self.op)
        self.farmer_token = auth_service.create_access_token(self.farmer_id, role="farmer")

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(
                text("DELETE FROM operators WHERE centre_id = :cid"), {"cid": self.centre_id}
            )
            await db.execute(text("DELETE FROM centres WHERE id = :cid"), {"cid": self.centre_id})
            await db.execute(text("DELETE FROM farmers WHERE id = :fid"), {"fid": self.farmer_id})
            await db.commit()
        await engine.dispose()

    async def test_sse_endpoint_auth_and_isolation(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Missing token -> 401
            resp_noauth = await client.get(f"/api/v1/events/stream?centre_id={self.centre_id}")
            self.assertEqual(resp_noauth.status_code, 401)

            # Farmer token on operator stream -> 401
            resp_wrong_role = await client.get(
                f"/api/v1/events/stream?centre_id={self.centre_id}",
                headers={"Authorization": f"Bearer {self.farmer_token}"},
            )
            self.assertEqual(resp_wrong_role.status_code, 401)

            # Wrong centre ID -> 403
            other_centre = str(uuid.uuid4())
            resp_wrong_centre = await client.get(
                f"/api/v1/events/stream?centre_id={other_centre}",
                headers={"Authorization": f"Bearer {self.op_token}"},
            )
            self.assertEqual(resp_wrong_centre.status_code, 403)


if __name__ == "__main__":
    unittest.main()
