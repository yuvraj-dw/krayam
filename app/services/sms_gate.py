import logging

import httpx

from app.config import get_settings
from app.exceptions import SMSGateError

logger = logging.getLogger(__name__)
settings = get_settings()


class SMSGateClient:
    """Async HTTP client for SMS Gate REST API.

    SMS Gate is an open-source Android app that acts as an SMS gateway.
    Docs: https://docs.sms-gate.app/
    """

    def __init__(self) -> None:
        self.base_url = settings.SMS_GATE_API_URL
        self.auth = (settings.SMS_GATE_USERNAME, settings.SMS_GATE_PASSWORD)

    async def send_sms(self, to: str, message: str) -> str:
        """Send an outgoing SMS. Returns the SMS Gate message ID."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/messages",
                    auth=self.auth,
                    json={"to": to, "message": message},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                message_id = data.get("id", "")
                logger.info("SMS sent to %s, message_id=%s", to, message_id)
                return message_id
            except httpx.HTTPStatusError as e:
                logger.error("SMS Gate HTTP error: %s", e.response.status_code)
                raise SMSGateError(f"SMS delivery failed: {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error("SMS Gate connection error: %s", e)
                raise SMSGateError("SMS service unreachable") from e

    async def get_message_status(self, message_id: str) -> dict:
        """Check delivery status of a sent message."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/messages/{message_id}",
                    auth=self.auth,
                    timeout=15.0,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error("SMS Gate status check failed: %s", e)
                return {"status": "unknown"}


sms_gate_client = SMSGateClient()
