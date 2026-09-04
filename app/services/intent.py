"""LLM-based natural-language intent parser for the SMS channel.

Read-only: converts free-form Hinglish/English text into a structured
IntentResult. It never touches the database — downstream business logic
validates and executes (plan section 23).
"""

import json
import logging
from datetime import datetime

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from app.config import get_settings

logger = logging.getLogger(__name__)

ALLOWED_INTENTS = {
    "book", "status", "history", "payment", "queue", "cancel",
    "reschedule", "register", "centre", "help", "unknown",
}

SYSTEM_PROMPT = (
    "You convert farmer SMS messages (Hinglish or English) into JSON. "
    "Only extract information that is explicitly stated or unambiguous. "
    "Never invent a crop, quantity, or date. "
    "intent must be one of: book, status, history, payment, queue, cancel, "
    "reschedule, register, centre, help, unknown. "
    "For a booking message, set intent='book' and extract crop, quantity, unit "
    "(default 'quintal'), and expected_date as ISO YYYY-MM-DD when present. "
    "If a booking is intended but a required field (crop, quantity, expected_date) "
    "is missing or ambiguous, set needs_clarification=true and list the missing "
    "field names in missing. confidence is 0.0-1.0. Return ONLY valid JSON: "
    '{"intent": "...", "crop": null, "quantity": null, "unit": null, '
    '"expected_date": null, "confidence": 0.0, "missing": [], '
    '"needs_clarification": false}'
)


class IntentResult(BaseModel):
    intent: str = "unknown"
    crop: str | None = None
    quantity: float | None = None
    unit: str | None = None
    expected_date: str | None = None
    confidence: float = 0.0
    missing: list[str] = []
    needs_clarification: bool = False


def parse_intent_json(raw: str) -> IntentResult | None:
    """Parse the model's JSON into an IntentResult, or None if unparseable."""
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    data.setdefault("crop", None)
    data.setdefault("quantity", None)
    data.setdefault("unit", None)
    data.setdefault("expected_date", None)
    data.setdefault("missing", [])
    data.setdefault("needs_clarification", False)
    intent = str(data.get("intent", "unknown"))
    if intent not in ALLOWED_INTENTS:
        intent = "unknown"
    data["intent"] = intent
    # Clamp confidence to [0, 1]; drop the whole result if it is not numeric.
    try:
        conf = float(data.get("confidence", 0.0) or 0.0)
    except (TypeError, ValueError):
        return None
    data["confidence"] = max(0.0, min(1.0, conf))
    # Validate quantity >= 0 when present.
    qty = data.get("quantity")
    if qty is not None:
        try:
            qty = float(qty)
        except (TypeError, ValueError):
            return None
        if qty < 0:
            return None
        data["quantity"] = qty
    # Validate expected_date is a real ISO date when present.
    ed = data.get("expected_date")
    if ed is not None:
        if not isinstance(ed, str):
            return None
        try:
            datetime.fromisoformat(ed)
        except (TypeError, ValueError):
            return None
    try:
        return IntentResult(**data)
    except ValidationError:
        return None


class IntentParser:
    async def parse(self, text: str) -> IntentResult | None:
        settings = get_settings()
        if not settings.LLM_ENABLED or not settings.LLM_API_KEY:
            return None

        client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        try:
            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("LLM parse failed for SMS: %s", e)
            return None

        raw = (response.choices[0].message.content if response.choices else "") or ""
        return parse_intent_json(raw)


intent_service = IntentParser()
