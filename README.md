# Krayam

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.x-D71F00)](https://www.sqlalchemy.org/)
[![Alembic](https://img.shields.io/badge/Alembic-migrations-5B9BD5)](https://alembic.sqlalchemy.org/)
[![Gemini](https://img.shields.io/badge/Gemini%20NLP-886CE4?logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![SMS Gate](https://img.shields.io/badge/SMS%20Gate-FF6C37?logo=android&logoColor=white)](https://sms-gate.app/)
[![SIH 2026](https://img.shields.io/badge/SIH-2026-1E8449)](https://www.sih.gov.in/)

Built for **Smart India Hackathon 2026**.

Krayam is a procurement platform that lets farmers sell their harvest to
processing centres (mandis) the way they already talk to people — by texting an
SMS from a basic feature phone — while offering the same experience through web
and mobile frontends. Centre operators run the queue, record procurements, and
process payments.

> **This repository** contains the **backend API** and the **SMS service** of
> the project. The web/mobile frontends live in separate repositories and talk
> to this backend over the REST API. The SMS channel is fully self-contained
> here: an inbound webhook, a conversational state machine, and Gemini-powered
> natural-language booking.

## Highlights

- **Dual channel, one business layer.** Registration, booking, status, queue,
  payment and history work identically over the REST API and over SMS. A
  booking made by SMS shows up in the operator queue and vice versa.
- **Natural-language SMS.** Free-form Hinglish/English texts (e.g. *"Mujhe 30
  quintal soybean bechna hai 15 September 2026"*) are parsed by **Gemini** into
  a structured intent and routed into the booking flow. The LLM is consulted
  only when no conversation is in progress and is read-only — all validation
  and writes go through the normal services.
- **Automated SMS notifications** — off-channel lifecycle events (booking confirmed, cancelled, rescheduled, procurement accepted, payment initiated & confirmed) are pushed to a farmer's phone via SMS.
- **Operator analytics + load forecast.** History aggregates (served farmers, procured quantity, wait/processing times, peak hours, no-shows, cancellations, payments) and a deterministic per-centre load forecast with high-load warnings — `GET /api/v1/analytics/summary` and `GET /api/v1/analytics/forecast`.
- **Conversational state machine.** SMS flows advance step by step
  (register → book → centre → slot → confirm) with session deduplication and a
  full message audit log in the database.
- **Phone-first auth.** OTP codes delivered by SMS, JWTs for the API. The
  verify endpoint returns `is_registered` so the app knows whether to finish
  onboarding.

## How it works

Two entry points, one business layer.

```
 farmers (web / mobile app)          farmers (feature phone)
       |  REST API + JWT                  |  SMS (plain text)
       v                                  v
  /api/v1/*  (FastAPI)             /sms/incoming  (SMS Gate webhook)
       |                                  |
       +------------> services <---------+
              auth · booking · queue · payment · intent · slot
       |
       v
  PostgreSQL (Supabase) — auth, SMS sessions/audit, queues, procurements, payments
```

> **AI scope:** The *only* AI in Krayam is the Gemini natural-language parser in the SMS channel. Centre ranking, wait-time ETA, payment-anomaly flags, operator analytics, and load forecasts are all deterministic, rule-based logic — there is no ML behind them.

## Tech stack

| Layer | Choice |
|---|---|
| Language / runtime | Python 3.10+, async |
| API | FastAPI + Pydantic v2 |
| Database | PostgreSQL on Supabase · SQLAlchemy 2 async ORM + asyncpg · Alembic migrations |
| Auth | OTP by SMS (DB-stored codes) · python-jose JWTs (HS256) |
| SMS | SMS Gate (Android SMS gateway) inbound webhook + outbound API |
| NLP | Gemini via OpenAI-compatible endpoint (`openai` SDK), model `gemini-3-flash-preview` |
| Geo / mandi lookup | geopy/Nominatim + India Pincode API |
| Tooling | ruff (lint) · mypy (types) |

## Project layout

```
app/
  main.py            FastAPI app, CORS, exception handlers, OpenAPI title
  config.py          env-driven settings (pydantic-settings)
  database.py        async engine + session factory
  routers/
    v1/              REST API — auth, farmers, centres, slots, bookings, operator
    sms/webhook.py   /sms/incoming entry point + conversation state machine
  services/          business logic — booking, queue, payment, procurement,
                     intent (Gemini NLP), slot, centre/mandi/location, sms_gate ...
  models/            SQLAlchemy tables (incl. sms_sessions message audit log)
  schemas/           Pydantic request/response models
  exceptions.py      unified error envelope
```

## Running locally

1. Create `.env` from `.env.example` and fill in: `DATABASE_URL`,
   `SMS_GATE_USERNAME` / `SMS_GATE_PASSWORD`, `JWT_SECRET_KEY`, and for
   natural-language SMS `LLM_ENABLED=true` + `LLM_API_KEY` (`.env` is gitignored).
2. Apply migrations: `alembic upgrade head`
3. Seed demo centres and slots — the dev seeding script is intentionally kept
   out of this repo, so create the demo data through the API: `POST /api/v1/centres`
   then `POST /api/v1/slots`.
4. Run the API: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
5. Expose the SMS webhook with a tunnel: `cloudflared tunnel run`
   (SMS Gate posts to `https://<tunnel>/sms/incoming`).

Interactive API docs → `http://127.0.0.1:8000/docs` · Health → `GET /api/v1/health`.
One-click launchers: `start_backend.bat` / `stop_backend.bat` (local, untracked).

## API overview

All REST endpoints live under **`/api/v1`**. Auth is phone-based OTP + JWT
(`Authorization: Bearer <token>`); verify returns `is_registered` so the client
knows whether to complete the profile via `/auth/register`.

| Group | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/otp/send` · `POST /auth/otp/verify` · `POST /auth/register` |
| Farmers | `GET /farmers/me` · `PUT /farmers/me` |
| Centres | `POST /centres` · `GET /centres` · `GET/PATCH /centres/{id}` · `POST /centres/{id}/crops` · `DELETE /centres/{id}` |
| Slots | `POST /slots` · `GET /slots?centre_id=&on_date=` |
| Bookings | `POST /bookings` · `GET /bookings` · `POST /bookings/recommend` · `GET /bookings/{id}` · `POST /bookings/{id}/cancel` · `POST /bookings/{id}/reschedule` |
| Operator | `POST /operator/check-in` · `POST /operator/call-next` · `GET /operator/queue/{centre_id}` · queue start/complete/no-show · `POST /operator/procurements` · procurement payment + review · `POST /operator/payments/{id}/verify` · `GET /operator/events/{type}/{id}` |
| Analytics | `GET /analytics/summary?centre_id=&from=&to=` · `GET /analytics/forecast?centre_id=&date=` |
| SMS | `POST /sms/incoming` (SMS Gate webhook) |

Errors always use `{ "error": { "code", "message" } }` with codes like
`AUTH_ERROR` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422).

## SMS service

- Accepts both the SMS Gate **envelope** and **flat** webhook payloads and
  deduplicates on `messageId`.
- Commands: `HELP REGISTER BOOK STATUS QUEUE CENTRE PAYMENT HISTORY CANCEL RESCHEDULE`.
- Multi-step flows live in the `sms_sessions` **database table** (each session
  carries `state` + `context`, 30-min expiry); dates are entered as **DD-MM-YYYY**.
- Free-text fallback: idle, non-command messages go to Gemini (30s timeout) and
  are routed by intent; `book` prefills the flow at the first missing field
  instead of guessing.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | asyncpg Postgres connection string |
| `SUPABASE_URL` / `SUPABASE_KEY` / `SUPABASE_SERVICE_KEY` | Supabase (optional) |
| `SMS_GATE_API_URL` / `SMS_GATE_USERNAME` / `SMS_GATE_PASSWORD` | SMS Gate outbound API |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` / `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | JWT auth |
| `OTP_LENGTH` / `OTP_EXPIRY_MINUTES` / `OTP_MAX_ATTEMPTS` / `OTP_RESEND_COOLDOWN_SECONDS` | OTP flow |
| `LLM_ENABLED` / `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` / `LLM_TIMEOUT_SECONDS` | Gemini NLP for natural-language SMS |
| `SMS_NOTIFICATIONS_ENABLED` | Set `false` to log notification SMS without sending (interactive replies are unaffected) |
| `APP_NAME` / `DEBUG` / `ALLOWED_ORIGINS` | App-level |

## Notes

- Operator endpoints are currently unauthenticated (prototype decision; role
  system planned).
- `DELETE /centres/{id}` and farmer deactivation are soft deletes.
- Phone numbers are stored in E.164 (`+91...`).

---

Built for **Smart India Hackathon (SIH) 2026**.