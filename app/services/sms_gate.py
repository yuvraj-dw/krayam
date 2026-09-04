import logging
import re

import httpx

from app.config import get_settings
from app.exceptions import SMSGateError

logger = logging.getLogger(__name__)
settings = get_settings()


def to_e164(phone: str, default_cc: str = "91") -> str:
    """Ensure the recipient is in E.164 format for SMS Gate.

    SMS Gate validates phoneNumbers against E.164. Our phone flow uses a
    local 10-digit Indian format, so prefix the country code here.
    """
    cleaned = re.sub(r"[\s\-\(\)+]", "", phone)
    if cleaned.startswith(default_cc) and len(cleaned) == 12:
        return f"+{cleaned}"
    return f"+{default_cc}{cleaned}"


class SMSGateClient:
    """Async HTTP client for SMS Gate REST API.

    SMS Gate is an open-source Android app that acts as an SMS gateway.
    Docs: https://docs.sms-gate.app/
    """

    def __init__(self) -> None:
        self.base_url = settings.SMS_GATE_API_URL
        self.auth = (settings.SMS_GATE_USERNAME, settings.SMS_GATE_PASSWORD)

    async def send_sms(self, to: str, message: str) -> str:
        """Send an outgoing SMS via SMS Gate cloud API. Returns message id."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/messages",
                    auth=self.auth,
                    json={
                        "phoneNumbers": [to_e164(to)],
                        "textMessage": {"text": message},
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                message_id = data.get("id") or data.get("messageId") or ""
                logger.info("SMS sent to %s, message_id=%s", to, message_id)
                return message_id
            except httpx.HTTPStatusError as e:
                logger.error(
                    "SMS Gate HTTP error: %s body=%s",
                    e.response.status_code,
                    e.response.text,
                )
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
