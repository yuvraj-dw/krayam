import unittest
import uuid

import httpx
from sqlalchemy import text

from app.database import async_session_factory, engine
from app.main import app
from app.services.auth import auth_service


class TestAuth(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.phone = "9876543210"
        self.norm_phone = "9876543210"
        async with async_session_factory() as db:
            await db.execute(text("DELETE FROM otps WHERE phone = :p"), {"p": self.norm_phone})
            await db.commit()

    async def asyncTearDown(self) -> None:
        async with async_session_factory() as db:
            await db.execute(text("DELETE FROM otps WHERE phone = :p"), {"p": self.norm_phone})
            await db.commit()
        await engine.dispose()

    async def test_send_otp_invalid_phone(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post("/api/v1/auth/otp/send", json={"phone": "123"})
            self.assertEqual(resp.status_code, 422)
            self.assertIn("error", resp.json())

    async def test_send_and_verify_otp_flow(self) -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post("/api/v1/auth/otp/send", json={"phone": self.phone})
            self.assertEqual(resp.status_code, 200)

            # Check OTP in DB
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
                code = row[0]

            # Verify OTP with wrong code
            resp_wrong = await client.post(
                "/api/v1/auth/otp/verify", json={"phone": self.phone, "code": "000000"}
            )
            self.assertEqual(resp_wrong.status_code, 422)

            # Verify OTP with right code
            resp_ok = await client.post(
                "/api/v1/auth/otp/verify", json={"phone": self.phone, "code": code}
            )
            self.assertEqual(resp_ok.status_code, 200)
            data = resp_ok.json()
            self.assertIn("access_token", data)
            self.assertFalse(data["is_registered"])

    async def test_auth_token_security_regressions(self) -> None:
        """Regression test for Fix 2: invalid UUID or wrong role must return 401, not 500."""
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            # 1. Pending token sent to farmer endpoint
            pending_token = auth_service.create_access_token(f"pending:{self.norm_phone}")
            resp = await client.get(
                "/api/v1/farmers/me", headers={"Authorization": f"Bearer {pending_token}"}
            )
            self.assertEqual(resp.status_code, 401)
            self.assertEqual(resp.json()["error"]["code"], "AUTH_ERROR")

            # 2. Token with non-UUID subject
            malformed_sub_token = auth_service.create_access_token("not-a-valid-uuid")
            resp = await client.get(
                "/api/v1/farmers/me", headers={"Authorization": f"Bearer {malformed_sub_token}"}
            )
            self.assertEqual(resp.status_code, 401)
            self.assertEqual(resp.json()["error"]["code"], "AUTH_ERROR")

            # 3. Operator token sent to farmer endpoint
            op_token = auth_service.create_access_token(
                str(uuid.uuid4()), role="operator", claims={"centre_id": str(uuid.uuid4())}
            )
            resp = await client.get(
                "/api/v1/farmers/me", headers={"Authorization": f"Bearer {op_token}"}
            )
            self.assertEqual(resp.status_code, 401)
            self.assertEqual(resp.json()["error"]["code"], "AUTH_ERROR")


if __name__ == "__main__":
    unittest.main()
