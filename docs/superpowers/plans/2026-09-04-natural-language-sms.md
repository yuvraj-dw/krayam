# Natural-Language SMS Parser (Gemini) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let farmers book and query through free-form Hinglish/English SMS by parsing their message with the Gemini LLM and feeding the extracted intent into the existing SMS flows.

**Architecture:** A read-only `IntentParser` service calls Gemini (via its OpenAI-compatible endpoint, driven by the standard `openai` client) and returns a structured `IntentResult`. The SMS webhook runs this parser only for non-command, non-conversation messages, maps recognized intents to existing flows (partial bookings continue from the first missing field), and replies with a helpful error when the LLM is unavailable or the message is unrecognized.

**Tech Stack:** FastAPI, SQLAlchemy (async), pydantic-settings, `openai` (client only), Gemini via OpenAI-compatible base URL, pytest/pytest-asyncio, httpx ASGI client, ruff, mypy.

## Global Constraints

- Use Python 3.10-compatible code (no `StrEnum`, no `datetime.UTC` — use `str, enum.Enum` and `datetime.now(timezone.utc)`).
- The AI parser MUST NOT directly modify the database; it only produces structured info (plan §23).
- Never guess critical transaction data — missing/ambiguous fields set `needs_clarification`/`missing`.
- LLM traffic is gated by `LLM_ENABLED`; when false or on error, do not call the network.
- Core commands (HELP/BOOK/STATUS/...) always run before NL parsing and are never blocked by an AI outage.
- LLM-unavailable or `unknown` → reply to the farmer: `"Sorry, I couldn't understand. Send HELP for the list of commands."`
- Tests must not send real SMS nor call the real LLM (monkeypatch `_send_reply` and the parser).
- `.env` is gitignored; never commit API keys.
- Line length 100. Follow the existing codebase patterns (services as singletons `xxx_service`, `# noqa: BLE001` where appropriate).

---

### Task 1: Add `openai` dependency and LLM settings

**Files:**
- Modify: `pyproject.toml` (add `openai` to `dependencies`)
- Modify: `app/config.py` (add `LLM_*` settings)
- Modify: `requirements.txt` (if it exists) — it does NOT exist; project uses pyproject only.

**Interfaces:**
- Produces: `Settings` fields `LLM_ENABLED: bool`, `LLM_BASE_URL: str`, `LLM_API_KEY: str`, `LLM_MODEL: str`, `LLM_TIMEOUT_SECONDS: float` — accessible via `get_settings()`.

- [ ] **Step 1: Add `openai` to `pyproject.toml` dependencies**

Add `"openai>=1.40.0",` to the `dependencies` list in `pyproject.toml` (alphabetical order — after `geopy`, before `python-jose`).

- [ ] **Step 2: Install the dependency in the environment**

Run: `pip install "openai>=1.40.0"`
Expected: installs successfully.

- [ ] **Step 3: Add LLM settings to `app/config.py`**

In `app/config.py`, inside the `Settings` class, after the `ALLOWED_ORIGINS` field, add:

```python
    # Natural-language SMS (Gemini via OpenAI-compatible endpoint)
    LLM_ENABLED: bool = False
    LLM_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"
    LLM_TIMEOUT_SECONDS: float = 8.0
```

- [ ] **Step 4: Verify settings load**

Run: `python -c "from app.config import get_settings; s = get_settings(); print(s.LLM_ENABLED, s.LLM_MODEL)"`
Expected: prints the configured values (from `.env` when present; `False gemini-2.0-flash` when absent).

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml app/config.py
git commit -m "feat: add openai dep and LLM config for natural-language SMS"
```

---

### Task 2: `IntentResult` schema and `IntentParser` service

**Files:**
- Create: `app/services/intent.py`
- Test: `tests/test_intent.py`

**Interfaces:**
- Consumes: `get_settings()` from `app.config`.
- Produces:
  - `class IntentResult(BaseModel)` with fields:
    `intent: str`, `crop: str | None`, `quantity: float | None`, `unit: str | None`,
    `expected_date: str | None`, `confidence: float`, `missing: list[str]`,
    `needs_clarification: bool`.
  - `class IntentParser` with `async def parse(self, text: str) -> IntentResult | None`.
  - `intent_service = IntentParser()` singleton.
  - `def parse_intent_json(raw: str) -> IntentResult | None` — pure helper that parses/validates the model's JSON string into an `IntentResult`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_intent.py`:

```python
import pytest


@pytest.mark.anyio
async def test_parse_returns_none_when_disabled(monkeypatch):
    from app.config import get_settings

    class _S:
        LLM_ENABLED = False
        LLM_API_KEY = ""
        LLM_MODEL = "gemini-2.0-flash"
        LLM_BASE_URL = "http://unused"
        LLM_TIMEOUT_SECONDS = 1.0

    monkeypatch.setattr(get_settings, "return_value", _S())
    from app.services.intent import intent_service

    result = await intent_service.parse("Mujhe 30 quintal gehun bechna hai")
    assert result is None


def test_parse_intent_json_valid():
    from app.services.intent import parse_intent_json

    raw = (
        '{"intent": "book", "crop": "Soybean", "quantity": 30.0, '
        '"unit": "quintal", "expected_date": "2026-09-15", '
        '"confidence": 0.98, "missing": [], "needs_clarification": false}'
    )
    r = parse_intent_json(raw)
    assert r is not None
    assert r.intent == "book"
    assert r.crop == "Soybean"
    assert r.quantity == 30.0
    assert r.expected_date == "2026-09-15"


def test_parse_intent_json_malformed_returns_none():
    from app.services.intent import parse_intent_json

    assert parse_intent_json("not json {") is None
    assert parse_intent_json("") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_intent.py -v`
Expected: FAIL — `ImportError` / module `app.services.intent` not found.

- [ ] **Step 3: Write the implementation**

Create `app/services/intent.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_intent.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Run lint**

Run: `ruff check app/services/intent.py tests/test_intent.py`
Expected: no issues.

- [ ] **Step 6: Commit**

```bash
git add app/services/intent.py tests/test_intent.py
git commit -m "feat: LLM intent parser service for natural-language SMS"
```

---

### Task 3: Webhook integration for natural-language messages

**Files:**
- Modify: `app/routers/sms/webhook.py` (in `_handle_command`, the fall-through section)
- Test: `tests/test_sms_nl.py`

**Interfaces:**
- Consumes:
  - `intent_service.parse(text) -> IntentResult | None`
  - `IntentResult` fields: `intent`, `crop`, `quantity`, `unit`, `expected_date`, `confidence`, `missing`, `needs_clarification`.
  - Existing `_handle_booking_flow` states `bk_crop` / `bk_quantity` / `bk_date` / `bk_centre` / `bk_slot`.
- Produces: the webhook now handles non-command messages via NL parsing; replies with the standard error message when unavailable/unknown.

- [ ] **Step 1: Write the failing test**

Create `tests/test_sms_nl.py`:

```python
import pytest
from sqlalchemy import delete

from app.database import engine
from app.models.farmer import Farmer
from app.services.intent import IntentResult

TEST_PHONE = "1999888777"


@pytest.fixture(autouse=True)
async def clean_nl_farmer():
    async with engine.begin() as conn:
        await conn.execute(delete(Farmer).where(Farmer.phone == TEST_PHONE))
    yield
    async with engine.begin() as conn:
        await conn.execute(delete(Farmer).where(Farmer.phone == TEST_PHONE))


@pytest.mark.anyio
async def test_nl_unknown_message_returns_error_reply(client, monkeypatch):
    # Patching the parse attribute on the shared singleton object also affects
    # the reference _handle_command holds, because it is the same instance.
    from app.routers.sms.webhook import _send_reply, get_settings
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr(get_settings, "return_value", _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    async def unknown(text):
        return IntentResult(intent="unknown")

    monkeypatch.setattr(intent_service, "parse", unknown)

    response = await client.post(
        "/sms/incoming",
        json={"message": "Mujhe kuch samajh nahi aaya", "sender": TEST_PHONE,
              "messageId": "nl-001"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert len(sent) == 1
    assert "HELP" in sent[0][1]


@pytest.mark.anyio
async def test_nl_llm_error_returns_error_reply(client, monkeypatch):
    # LLM feature on, but the call fails (parser returns None) -> the user
    # chose a helpful error reply for this case too.
    from app.routers.sms.webhook import _send_reply, get_settings
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr(get_settings, "return_value", _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)
    monkeypatch.setattr(intent_service, "parse", lambda text: None)

    response = await client.post(
        "/sms/incoming",
        json={"message": "gibberish ???", "sender": TEST_PHONE, "messageId": "nl-004"},
    )
    assert response.status_code == 200
    assert len(sent) == 1
    assert "HELP" in sent[0][1]


@pytest.mark.anyio
async def test_nl_disabled_is_silent(client, monkeypatch):
    # When the LLM feature is off the webhook must stay silent (preserves the
    # legacy "ignore carrier notices" behaviour and never touches the network).
    from app.routers.sms.webhook import _send_reply, get_settings

    class _S:
        LLM_ENABLED = False

    monkeypatch.setattr(get_settings, "return_value", _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    response = await client.post(
        "/sms/incoming",
        json={"message": "some carrier notice", "sender": TEST_PHONE,
              "messageId": "nl-003"},
    )
    assert response.status_code == 200
    assert sent == []


@pytest.mark.anyio
async def test_nl_book_intent_unregistered_asks_register(client, monkeypatch):
    from app.routers.sms.webhook import _send_reply, get_settings
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr(get_settings, "return_value", _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    async def book_result(text):
        return IntentResult(
            intent="book", crop="Soybean", quantity=30.0, unit="quintal",
            expected_date="2026-09-15", confidence=0.95,
            missing=[], needs_clarification=False,
        )

    monkeypatch.setattr(intent_service, "parse", book_result)

    response = await client.post(
        "/sms/incoming",
        json={"message": "Mujhe 30 quintal soybean bechna hai",
              "sender": TEST_PHONE, "messageId": "nl-002"},
    )
    assert response.status_code == 200
    # Farmer for the test phone is deleted in the fixture, so the flow must
    # ask them to register first.
    assert len(sent) == 1
    assert "register" in sent[0][1].lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_sms_nl.py -v`
Expected: FAIL — `intent_service` not present in webhook namespace (ImportError) and the NL fall-through is not implemented (first test gets no reply).

- [ ] **Step 3: Implement intent routing in the webhook**

In `app/routers/sms/webhook.py`:

1. Add the imports. Place `intent_service` in the services block near the other service imports (around line 24, after `from app.services.farmer import farmer_service`), and `get_settings` in the config/imports area (e.g. after `from app.utils.phone import normalize_phone` at line 34):

```python
from app.config import get_settings
```

```python
from app.services.intent import intent_service
```

2. Replace the final fall-through in `_handle_command` (the current block at the very end, after the `RESCHEDULE` handler):

```python
    # Not a recognised command. Try natural-language parsing. When the LLM
    # feature is off, parse() returns None and we stay silent (legacy author
    # behaviour for carrier service notices). When the model runs but cannot
    # map the message, it returns intent == "unknown" and we reply with help.
    if session.state and session.state != "idle":
        return "Sorry, I didn't understand that. Send HELP for available commands."
    return None
```

becomes:

```python
    # Not a recognised command. Try natural-language parsing.
    reply = await _try_natural_language(db, session, text, phone)
    if reply:
        return reply
    # LLM unavailable/disabled: stay silent for carrier service notices, but
    # still prompt if we are mid-conversation.
    if session.state and session.state != "idle":
        return "Sorry, I didn't understand that. Send HELP for available commands."
    return None
```

3. Add these two top-level async functions to the module (place them between `_handle_command` and the `@router.post("/sms/incoming")` endpoint, around line 620):

```python
# The intent values produced by parse_intent_json are the lowercase set from
# ALLOWED_INTENTS ("book", "status", "history", "payment", "queue", "cancel",
# "reschedule", "register", "centre", "help", "unknown").


async def _try_natural_language(
    db: AsyncSession, session: SMSSession, text: str, phone: str
) -> str | None:
    """Try to interpret a free-form message as a platform request via the LLM.

    Returns a reply string, or None when nothing should be sent.
    - LLM feature off (LLM_ENABLED=false): stay silent (legacy carrier-notice
      behaviour; no network is ever touched in this mode).
    - LLM on but unavailable/error, or intent == "unknown": reply with the
      helpful HELP error (the user-chosen fallback).
    """
    settings = get_settings()
    if not settings.LLM_ENABLED:
        return None

    result = await intent_service.parse(text)
    if result is None:
        # LLM call failed, timed out, or produced unparseable JSON.
        return "Sorry, I couldn't understand. Send HELP for the list of commands."

    error_reply = "Sorry, I couldn't understand. Send HELP for the list of commands."
    intent = result.intent
    if intent == "book":
        return await _nl_begin_booking(db, session, phone, result)
    if intent in ("status", "queue", "payment", "history", "cancel",
                  "reschedule", "register", "centre", "help"):
        return await _handle_command(db, phone, intent.upper(), session)
    return error_reply


async def _nl_begin_booking(
    db: AsyncSession, session: SMSSession, phone: str, result
) -> str:
    """Pre-fill the booking flow from the LLM result, resuming at the first
    missing field (plan: never guess critical data; ask when unsure)."""
    ctx: dict = {}
    if result.crop:
        ctx["crop"] = result.crop
    if result.quantity is not None:
        ctx["quantity"] = result.quantity
    if result.expected_date:
        ctx["expected_date"] = result.expected_date

    farmer = await _get_farmer(db, phone)
    if not farmer:
        session.state = "bk_crop"
        session.context = {}
        return "To book, first register. Send REGISTER."

    if not result.crop:
        session.state = "bk_crop"
        session.context = ctx
        return "Enter the crop name (e.g. Soybean)."
    if result.quantity is None:
        session.state = "bk_quantity"
        session.context = ctx
        return "Enter the quantity in quintals (e.g. 12)."
    if not result.expected_date:
        session.state = "bk_date"
        session.context = ctx
        return "Enter the expected procurement date in DD-MM-YYYY (e.g. 15-09-2026)."

    # All core fields present: resume at the bk_date step with a DD-MM-YYYY
    # reply so the existing handler runs recommendation and moves on to centre
    # and slot selection. The model returns an ISO date; convert it here.
    d = date.fromisoformat(result.expected_date)
    session.context = {**ctx, "crop": result.crop, "quantity": result.quantity}
    reply = await _handle_booking_flow(db, session, d.strftime("%d-%m-%Y"), phone)
    if not reply:
        return "Could not complete booking. Send BOOK to start again."
    return reply
```

Note: The `db` parameter is threaded through for consistency with the existing flow; the booking flow handlers already take `db`. The `date` symbol is already imported in `webhook.py` (`from datetime import date, ...`).


- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_sms_nl.py -v`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `pytest -q`
Expected: all tests pass (existing + new).

- [ ] **Step 6: Run lint and typecheck**

Run: `ruff check .`
Run: `mypy app`
Expected: no new errors. If mypy flags the added function signatures, annotate returns with `-> str | None` / `-> str`.

- [ ] **Step 7: Commit**

```bash
git add app/routers/sms/webhook.py tests/test_sms_nl.py
git commit -m "feat: natural-language SMS routing via LLM intent"
```

---

### Task 4: Live smoke verification (manual, optional-gated)

**Files:**
- None (manual verification).

**Interfaces:**
- Consumes: running webhook + `.env` with `LLM_ENABLED=true`, `LLM_API_KEY`, Gemini base URL.

- [ ] **Step 1: Confirm `.env` is configured**

Ensure `.env` has `LLM_ENABLED=true`, `LLM_API_KEY=<your key>`,
`LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`,
`LLM_MODEL=gemini-2.0-flash`.

- [ ] **Step 2: Test the parser directly (safe — read-only, no SMS)**

Run (from the project dir):

```
python -c "import asyncio; from app.services.intent import intent_service; m=asyncio.run(intent_service.parse('Mujhe 30 quintal gehun bechna hai 15 September ko')); print(m)"
```

Expected: an `IntentResult` with `intent='book'`, `crop`/`quantity`/`expected_date` populated when the key is valid, or `None` when the key/model is unreachable.

- [ ] **Step 3: (Optional, live) Send a natural-language SMS to the user's registered number**

Only with explicit user confirmation. Send a message like *"Mujhe 20 quintal soybean bechna hai 5 October ko"* from a registered SMS number and verify the flow replies asking for the next field or proceeding to centre selection.

- [ ] **Step 4: Commit any transcription-only changes if the run drifted**

Usually nothing to commit here.
