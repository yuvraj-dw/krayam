# Krayam

Procurement platform that lets farmers sell their harvest to processing centres
(mandis) — over **SMS** (feature phones, no app needed) and through **web/mobile
frontends**. Centre operators manage queues, record procurements, and process
payments.

## Highlights

- **Dual channel, one business layer.** Registration, booking, status, queue,
  payment and history all work identically over the REST API and over SMS. A
  booking made by SMS shows up in the operator queue and vice versa.
- **Natural-language SMS.** Free-form Hinglish/English texts (e.g. *"Mujhe 30
  quintal soybean bechna hai 15 September 2026"*) are parsed by **Gemini** into
  a structured intent and routed into the booking flow. The LLM is consulted
  only when there is no conversation in progress and is read-only — all
  validation and writes go through the normal services.
- **Conversational state machine.** SMS flows advance step-by-step
  (register → book → centre → slot → confirm), with session deduplication and a
  full message audit log in the database.

## Stack

- Python 3.10, **FastAPI** (async) + Pydantic v2
- **SQLAlchemy 2** async ORM + **asyncpg**, PostgreSQL on **Supabase**, Alembic migrations
- JWT auth (**python-jose**, HS256) + DB-stored OTP codes
- **SMS Gate** (open-source Android SMS gateway) for inbound/outbound SMS
- **Gemini** via the OpenAI-compatible endpoint (`openai` SDK)
- `httpx`, pytest + anyio (hermetic tests)

## Layout

```
app/
  main.py            FastAPI app, CORS, exception handlers
  config.py          env-driven settings
  database.py        async engine + session factory
  routers/
    v1/              REST API (auth, farmers, centres, slots, bookings, operator)
    sms/webhook.py   /sms/incoming entry point + conversation state machine
  services/          business logic (booking, queue, payment, recommendation, intent, ...)
  models/            SQLAlchemy tables
  schemas/           Pydantic request/response models
  exceptions.py      unified error envelope
```

## Running locally

1. Copy the keys from `app/config.py` into a `.env`:
   `DATABASE_URL`, `SMS_GATE_*`, `JWT_SECRET_KEY`, `LLM_ENABLED`/`LLM_API_KEY`, `ALLOWED_ORIGINS`, ... (`.env` is gitignored).
2. Apply migrations: `alembic upgrade head`
3. Seed demo centres + slots (needed for booking to return results):
   `python -m scripts.seed_sms_demo`
4. Run: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
5. Expose the SMS webhook to the internet: `cloudflared tunnel run`
   (SMS Gate posts to `https://<tunnel>/sms/incoming`).

Interactive API docs: `http://127.0.0.1:8000/docs`.

## API overview

All REST endpoints live under **`/api/v1`**. Auth is phone-based OTP + JWT
(`Authorization: Bearer <token>`); verify returns `is_registered` so the client
knows whether to complete the profile via `/auth/register`.

| Group | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/otp/send`, `POST /auth/otp/verify`, `POST /auth/register` |
| Farmers | `GET /farmers/me`, `PUT /farmers/me` |
| Centres | `POST /centres`, `GET /centres`, `GET/PATCH /centres/{id}`, `POST /centres/{id}/crops`, `DELETE /centres/{id}` |
| Slots | `POST /slots`, `GET /slots?centre_id=&on_date=` |
| Bookings | `POST /bookings`, `GET /bookings`, `POST /bookings/recommend`, `GET /bookings/{id}`, `POST /bookings/{id}/cancel`, `POST /bookings/{id}/reschedule` |
| Operator | `POST /operator/check-in`, `POST /operator/call-next`, `GET /operator/queue/{centre_id}`, queue start/complete/no-show, `POST /operator/procurements`, procurement payment + review, `POST /operator/payments/{id}/verify`, `GET /operator/events/{type}/{id}` |
| SMS | `POST /sms/incoming` (SMS Gate webhook) |

Error responses always use `{ "error": { "code", "message" } }` with codes like
`AUTH_ERROR` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422).

## SMS service

- Inbound webhook accepts both the SMS Gate **envelope** and **flat** payload
  formats and deduplicates on `messageId`.
- Commands: `HELP REGISTER BOOK STATUS QUEUE CENTRE PAYMENT HISTORY CANCEL RESCHEDULE`.
- Multi-step flows live in `sms_sessions` (`state` + `context`, 30-min expiry);
  dates are entered as **DD-MM-YYYY**.
- Free-text fallback: idle non-command messages are sent to Gemini
  (`gemini-3-flash-preview`, 30s timeout) and routed by intent; `book` prefills
  the flow at the first missing field instead of guessing.
- Test number (dev): `+91xxxxxxxxxx` — reuse only for testing.

## Notes

- Operator endpoints currently have no auth (prototype decision; role system planned).
- `DELETE /centres/{id}` and farmer deactivation are soft deletes.
- Phone numbers are stored as E.164 (`+91...`).