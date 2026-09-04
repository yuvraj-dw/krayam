# Natural-Language SMS Parser (Gemini) — Design

Date: 2026-09-04
Status: Approved
Scope: Backend + SMS service (per `plan.md` section 23 — Natural-Language SMS)

## 1. Problem

The SMS channel currently requires rigid commands (`BOOK`, `STATUS`, etc.). `plan.md`
(Section 23) requires the system to accept natural-language messages. Example:

    "Mujhe 30 quintal gehun bechna hai 15 September ko"

The AI/NLP layer must extract structured booking information (intent, crop, quantity,
unit, expected date), ask for missing/ambiguous critical data, and hand the structured
info to the normal backend business logic. The AI parser must NOT directly modify the
database, and must not guess critical transaction information.

## 2. Decisions (confirmed with user)

- **Provider**: Google Gemini, using its **OpenAI-compatible endpoint**
  (`https://generativelanguage.googleapis.com/v1beta/openai/`), driven via the standard
  `openai` Python client. This keeps the parser provider-agnostic (swap provider by
  changing base URL + key + model in `.env`, no code change).
- **Integration**: Live LLM call in the SMS webhook for unrecognized, non-command messages.
- **Fallback when LLM unavailable/unknown**: reply to the farmer with a helpful error
  suggesting `HELP` (chosen over silent-drop).
- **Partial booking**: when the LLM extracts a partial booking, continue the existing
  `bk_` flow from the first missing field (do not restart from scratch).

## 3. Architecture

### 3.1 Config (`app/config.py`)

Add settings (all read from `.env` via existing pydantic-settings):

| Setting | Default |
|---|---|
| `LLM_ENABLED` | `False` |
| `LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `LLM_API_KEY` | `""` |
| `LLM_MODEL` | `gemini-2.0-flash` |
| `LLM_TIMEOUT_SECONDS` | `8.0` |

`LLM_ENABLED` gates all LLM traffic so existing tests and DB-only environments never hit
the network.

### 3.2 New service: `app/services/intent.py`

- `IntentResult(BaseModel)`:
  - `intent: str` — one of `book`, `status`, `history`, `payment`, `queue`, `cancel`,
    `reschedule`, `register`, `centre`, `help`, or `unknown`.
  - `crop: str | None`
  - `quantity: float | None`
  - `unit: str | None`
  - `expected_date: str | None` — ISO date (`YYYY-MM-DD`)
  - `confidence: float` (0.0–1.0)
  - `missing: list[str]` — fields the model could not determine (e.g. `["expected_date"]`)
  - `needs_clarification: bool`
- `IntentParser.parse(text: str) -> IntentResult | None`
  - Returns `None` if `LLM_ENABLED` is false, no API key, request timeout, or API error.
  - Builds a strict-JSON system prompt describing the output schema and rules:
    - Extract only what is explicitly present or highly inferable; never invent critical
      values.
    - If a required booking field (crop / quantity / expected_date) is missing or
      ambiguous, set `needs_clarification=True` and list it in `missing`.
    - Return `intent="unknown"` for messages that are not clearly a platform request.
  - On a successful response, parses the JSON into `IntentResult` and validates types
    (quantity ≥ 0, ISO date, confidence within [0,1]).
- `intent_service = IntentParser()` singleton.

The parser is **read-only**; it never touches the database (plan §23).

### 3.3 Webhook integration (`app/routers/sms/webhook.py`, `_handle_command`)

Only when the message is **not** a recognised command and there is **no active
conversation** currently does NL parsing run:

1. If `LLM_ENABLED` is false → return existing default behavior (silent `None`).
2. Call `intent_service.parse(text)`.
3. If `parse` returns `None` (LLM disabled/unavailable/error) → reply:
   `"Sorry, I couldn't understand. Send HELP for the list of commands."`
4. Map the returned intent:
   - `book`:
     - If `needs_clarification` and essential fields missing → start the `bk_` flow at
       the first missing field, pre-filling the fields the LLM did extract:
       - no crop → `bk_crop`
       - else no quantity → `bk_quantity`
       - else no date → `bk_date`
       - else (all present) → proceed to centre recommendation.
     - If everything present → fill `context` and reuse the existing centre-recommendation
       step (the same logic the `bk_date` state runs: `recommendation_service.recommend`,
       then the `bk_centre` / `bk_slot` selection prompts).
   - `status`/`history`/`payment`/`queue`/`cancel`/`reschedule`/`register`/`centre`/`help`
     → map to the existing command reply handler.
   - `unknown` → reply with the error message above.
5. Core commands (`HELP`, `BOOK`, `STATUS`, ...) are matched and handled **before** NL
   parsing, so an AI outage/latency never delays or breaks them.

## 4. Reliability & plan compliance

- AI parser is read-only; the existing business logic (slot validation, status
  transitions, centre recommendation) still validates everything.
- 8s timeout + full exception handling → a slow/failed LLM cannot hang or break the SMS
  reply path.
- Feature-gated by `LLM_ENABLED` → tests and non-LLM environments are unaffected.
- Never guesses critical transaction data: ambiguous/missing values trigger
  `needs_clarification` and the farmer is asked.

## 5. Testing

- `tests/test_intent.py` — mock LLM response mapping:
  - valid JSON → correct `IntentResult`;
  - missing fields → `missing` + `needs_clarification`;
  - `unknown` intent;
  - malformed/non-JSON → handled gracefully.
- `tests/test_sms_nl.py` — webhook-level with a mocked parser:
  - natural-language booking pre-fills flow and resumes at the right step;
  - unavailable-LLM path returns the error reply;
  - core commands still work when `LLM_ENABLED` is false.

## 6. Out of scope

- LLM-driven selection of centre/slot (still chosen interactively via the existing flow).
- Full Hinglish lexicon/rule fallback (chosen to rely on the LLM; a rule fallback can be
  added later behind `IntentParser` if needed).
- Notifications, realtime, offline sync, forecasting/AI phase.

## 7. Dependencies

- `openai` (client only; pointed at Gemini's OpenAI-compatible base URL).
- Add `LLM_*` settings to `.env` (developer must supply `LLM_API_KEY` for live use).
