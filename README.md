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

Krayam is an agricultural procurement platform that lets farmers sell their harvest to processing centres (mandis) the way they already communicate — by sending simple SMS messages from a basic feature phone — while offering the exact same real-time capabilities through modern web and mobile applications. Centre operators manage arrival queues, record physical quality inspections, verify procurements, and process payments.

> **This repository** contains the core **backend API**, **SMS webhook & conversation engine**, **real-time SSE event bus**, and **offline sync engine**. The web and mobile frontends interface with this backend over the standardized REST API and Server-Sent Events (SSE).

---

## Highlights

- **Dual channel, one business layer:** Registration, booking, status, queue, procurement, payment, and history work identically over the REST API and over SMS. An appointment booked via SMS instantly appears on the operator dashboard queue, and updates made at the centre immediately notify the farmer.
- **Natural-language SMS (Gemini NLP):** Free-form English and Hinglish texts (e.g., *"Mujhe 30 quintal soybean bechna hai 15 September 2026"*) are parsed by **Gemini** into structured intents and routed into the booking workflow. The LLM is consulted only when no active session is in progress and is strictly read-only — all state transitions and writes pass through deterministic business validation.
- **Transactional Outbox & Live Real-Time Events:** Every booking, queue, procurement, and payment state mutation emits an ordered event into the `outbox_events` table within the primary DB transaction. Once committed, events are published instantly to an in-memory event bus and streamed over **Server-Sent Events (SSE)** to connected operators and farmers without database polling.
- **Offline Centre Sync:** Mandi centres experiencing connectivity drops can run offline progressive web apps (PWAs). The offline client caches snapshots, operates locally, and re-syncs batches of timestamped events via `POST /api/v1/sync/{centre_id}/events`. Server-side deduplication using `client_event_id` guarantees idempotent reconciliation.
- **Operator Analytics & Load Forecasting:** Deterministic per-centre metrics (`GET /api/v1/analytics/summary`) aggregate farmer throughput, procured tonnage, average wait and processing durations, peak arrival hours, cancellation rates, and payment settlements. A capacity forecasting endpoint (`GET /api/v1/analytics/forecast`) computes anticipated load percentages with proactive overload warnings.
- **Conversational State Machine:** Multi-step SMS flows (register, book, select centre, select slot, confirm) are managed via the `sms_sessions` database table with 30-minute expiry, automatic step resumption, and idempotency protection against duplicate SMS gateway deliveries.
- **Automated Lifecycle Notifications:** Automated SMS alerts notify farmers when appointments are confirmed, cancelled, or rescheduled, when produce is accepted, and when payments are initiated or confirmed.
- **Enterprise Access Control & Timing-Safe Security:** Operator authentication uses PBKDF2 password hashing (100,000 iterations via standard library `hashlib`) with isolated centre-level scoping. Service keys use constant-time comparisons (`hmac.compare_digest`), preventing timing side-channel attacks.

---

## Architectural Architecture

```
 farmers (web / mobile app)          farmers (feature phone)
       |  REST API + JWT                  |  SMS (plain text)
       v                                  v
  /api/v1/*  (FastAPI)             /sms/incoming  (SMS Gate webhook)
       |                                  |
       +------------> services <---------+
              auth · booking · queue · payment · intent · slot
       |
       +---------> Transactional Outbox (PostgreSQL)
                        |
                        v
               Event Bus (asyncio) ------> SSE Streams (/api/v1/events/*)
                        |
                        v
               Offline Sync Engine (/api/v1/sync/*)
```

> **AI Scope Note:** The *only* AI component in Krayam is the Gemini natural-language intent extractor in the SMS channel. Centre recommendation scoring, wait-time estimation, payment anomaly detection, capacity forecasting, SSE event broadcasting, and offline conflict resolution are completely deterministic, rule-based systems.

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Language / Runtime** | Python 3.10+, fully asynchronous (`asyncio`) |
| **Framework** | FastAPI + Pydantic v2 |
| **Database** | PostgreSQL · SQLAlchemy 2.0 Async ORM · asyncpg driver |
| **Database Migrations** | Alembic |
| **Authentication** | SMS OTP (DB-stored with rate limiting & salt) · JWT (`python-jose`, HS256) |
| **Operator Passwords** | PBKDF2-SHA256 (100,000 iterations, stdlib `hashlib`) |
| **Realtime Streaming** | Server-Sent Events (SSE) backed by in-memory `asyncio.Queue` event bus |
| **SMS Gateway** | SMS Gate (Android SMS Gateway) inbound webhook + outbound REST API |
| **Natural Language** | Google Gemini via OpenAI-compatible endpoint (`openai` SDK, `gemini-3-flash-preview`) |
| **Geolocation & Mandi Data** | `geopy` / Nominatim + India Pincode API |
| **Code Quality & Testing** | `ruff` (linter/formatter) · `mypy` (strict static typing) · `unittest` (async test suite) |

---

## Project Structure

```
SIH/
├── alembic/                      # Database migrations
│   ├── env.py
│   └── versions/                 # Revision scripts (001_initial, 002_offline_sync)
├── app/
│   ├── config.py                 # Pydantic Settings with .env loading
│   ├── database.py               # Async SQLAlchemy engine, session maker, base model
│   ├── dependencies.py           # FastApi dependencies (auth, roles, centre scoping)
│   ├── exceptions.py             # Standardized error envelope & handlers
│   ├── main.py                   # FastAPI application initialization & middleware
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── booking.py            # Bookings & lifecycle statuses
│   │   ├── centre.py             # Procurement centres & accepted crops
│   │   ├── event.py              # Audit events log
│   │   ├── farmer.py             # Farmers & OTP verifications
│   │   ├── operator.py           # Centre operators & auth
│   │   ├── outbox.py             # Outbox event log for realtime & offline sync
│   │   ├── payment.py            # Payments, verification & anomalies
│   │   ├── procurement.py        # Produce intake & grading records
│   │   ├── queue.py              # Centre arrival queues & positions
│   │   ├── slot.py               # Time slots & dynamic booking capacity
│   │   └── sms.py                # SMS message logs & conversation sessions
│   ├── routers/
│   │   ├── sms/webhook.py        # /sms/incoming entry point & state machine
│   │   └── v1/                   # REST endpoints (auth, bookings, operator, sync, etc.)
│   ├── schemas/                  # Pydantic validation schemas
│   └── services/                 # Core business services (booking, payment, outbox, etc.)
├── tests/                        # Comprehensive automated test suite
│   ├── test_health.py            # Health & readiness checks
│   ├── test_auth.py              # OTP, login, security, role enforcement
│   ├── test_centres.py           # Centre CRUD, crop management, 404 validation
│   ├── test_slots.py             # Slot availability, full slot recovery
│   ├── test_bookings.py          # Booking creation, capacity locks, cancellation
│   ├── test_operator.py          # Operator queue, procurement, payment & IDOR security
│   ├── test_analytics.py         # Summary metrics & capacity forecasting
│   ├── test_events_sse.py        # SSE streams & authorization
│   ├── test_sync.py              # Offline sync snapshot, batch apply & cursor pull
│   ├── test_sms.py               # Webhook parsing, idempotency & live event publishing
│   └── run_all.py                # Complete test runner harness
├── pyproject.toml                # Project metadata & tool configuration
├── alembic.ini                   # Alembic configuration
└── README.md
```

---

## Running Locally

### 1. Environment Setup
Clone the repository and set up a Python virtual environment:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create `.env` in the root folder (referenced from `.env.example`):
```ini
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/<dbname>
JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Operator Registration
SUPABASE_SERVICE_KEY=<secret-key-for-operator-registration>

# SMS Gate Integration
SMS_GATE_API_URL=https://api.sms-gate.app/3rdparty/v1
SMS_GATE_USERNAME=<username>
SMS_GATE_PASSWORD=<password>
SMS_NOTIFICATIONS_ENABLED=true

# Gemini NLP (Optional, for natural-language SMS)
LLM_ENABLED=true
LLM_API_KEY=<your-gemini-api-key>
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-2.5-flash
```

### 3. Apply Database Migrations
```powershell
alembic upgrade head
```

### 4. Start the Application
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

### 5. Expose SMS Webhook (Optional for Live SMS Testing)
When receiving SMS callbacks from SMS Gate:
```powershell
cloudflared tunnel --url http://127.0.0.1:8000
```
Configure `https://<your-tunnel-url>/sms/incoming` as the webhook URL in your SMS Gate application.

---

## Running Automated Tests & Quality Gates

The backend includes a comprehensive test suite covering all routes, services, edge cases, role enforcement, and regression scenarios without requiring external test runners:

```powershell
# Run the complete test suite
python tests/run_all.py

# Run static linter
python -m ruff check app/ tests/

# Run type checker
python -m mypy app/ --no-incremental
```

---

## Complete API Reference

All REST endpoints are rooted at **`/api/v1`**. Responses and errors follow strict, uniform schemas.

### Authentication & Profile (`/auth`, `/farmers`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/otp/send` | None | Sends a 6-digit OTP to the specified 10-digit Indian phone number with resend cooldown and rate limiting. |
| `POST` | `/api/v1/auth/otp/verify` | None | Verifies the OTP. Returns a JWT access token and `is_registered` boolean flag. |
| `POST` | `/api/v1/auth/register` | Pending Token | Completes farmer onboarding using a temporary registration token. |
| `GET` | `/api/v1/farmers/me` | Farmer JWT | Returns profile details for the authenticated farmer. |
| `PUT` | `/api/v1/farmers/me` | Farmer JWT | Updates farmer name, village, district, state, pincode, or coordinates. |

### Procurement Centres & Slots (`/centres`, `/slots`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/centres` | None | Scaffolds a new procurement centre (operating hours, location, capacity). |
| `GET` | `/api/v1/centres` | None | Lists active procurement centres with optional `?crop=` filtering. |
| `GET` | `/api/v1/centres/{id}` | None | Retrieves centre details and currently accepted crop varieties with rates. |
| `PATCH`| `/api/v1/centres/{id}` | None | Updates operational parameters (name, capacity, hours). |
| `POST` | `/api/v1/centres/{id}/crops` | None | Adds or reactivates an accepted crop with rate per quintal. |
| `DELETE`|`/api/v1/centres/{id}` | None | Soft-deactivates a centre. |
| `POST` | `/api/v1/slots` | None | Creates a bookable time window with date, start/end time, and max capacity. |
| `GET` | `/api/v1/slots` | None | Lists available slots for a centre with capacity remaining on a given date. |

### Bookings (`/bookings`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Farmer JWT | Books a procurement appointment. Validates slot capacity and increments booking counters. Emits outbox event. |
| `GET` | `/api/v1/bookings` | Farmer JWT | Lists historical and upcoming bookings for the authenticated farmer. |
| `POST` | `/api/v1/bookings/recommend` | Farmer JWT | Returns recommended centres sorted by proximity and anticipated load. |
| `GET` | `/api/v1/bookings/{id}` | Farmer JWT | Retrieves booking status and details (enforces ownership). |
| `POST` | `/api/v1/bookings/{id}/cancel` | Farmer JWT | Cancels booking, releases slot capacity, and emits realtime cancellation event. |
| `POST` | `/api/v1/bookings/{id}/reschedule` | Farmer JWT | Reschedules booking date, centre, or slot, updating capacity counts across centres. |

### Operator Operations (`/operator`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/operator/register` | Service Key | Creates an operator account bound to a specific centre (`X-Service-Key` header). |
| `POST` | `/api/v1/operator/login` | None | Authenticates operator using phone + password, returning scoped JWT. |
| `POST` | `/api/v1/operator/check-in` | Operator JWT | Checks in a farmer on arrival. Assigns ordered queue position. |
| `POST` | `/api/v1/operator/call-next` | Operator JWT | Advances the queue and marks the next waiting farmer as called. |
| `GET` | `/api/v1/operator/queue/{centre_id}` | Operator JWT | Returns the live waiting queue for the operator's assigned centre. |
| `POST` | `/api/v1/operator/queue/{id}/start` | Operator JWT | Marks weighbridge and inspection processing as started. |
| `POST` | `/api/v1/operator/queue/{id}/complete` | Operator JWT | Marks processing as complete and cleans up the queue entry. |
| `POST` | `/api/v1/operator/queue/{id}/no-show` | Operator JWT | Marks an unarrived booking as no-show and re-numbers the queue. |
| `POST` | `/api/v1/operator/procurements` | Operator JWT | Records accepted quantity, unit, and grading notes for an appointment. |
| `POST` | `/api/v1/operator/procurements/{id}/payment` | Operator JWT | Computes backend payment amount from centre rates and initiates payout. Guarded against duplicate initiation. |
| `GET` | `/api/v1/operator/procurements/{id}/review` | Operator JWT | Returns payment review payload with anomaly detection flags. |
| `POST` | `/api/v1/operator/payments/{id}/verify` | Operator JWT | Operator verifies or rejects payment settlement. |
| `GET` | `/api/v1/operator/events/{type}/{id}` | Operator JWT | Retrieves audit event history for a booking, queue, procurement, or payment (strictly scoped to operator's centre). |

### Real-Time Updates & Offline Sync (`/events`, `/sync`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/events/stream?centre_id=` | Operator JWT | SSE connection streaming live centre-scoped events with replay via `Last-Event-ID`. |
| `GET` | `/api/v1/events/me` | Farmer JWT | SSE connection streaming personal booking, queue, and payment alerts to the farmer. |
| `GET` | `/api/v1/sync/{centre_id}/snapshot` | Operator JWT | Downloads full offline snapshot: centre data, crops, active slots, today's bookings, and waitlist. |
| `GET` | `/api/v1/sync/{centre_id}/events?cursor=` | Operator JWT | Pulls incremental mutations occurring after `cursor` for offline client catch-up. |
| `POST` | `/api/v1/sync/{centre_id}/events` | Operator JWT | Submits batch of offline-generated events. Idempotently reconciles with deduplication. |

### Analytics (`/analytics`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/summary` | None | Aggregates farmers served, total tonnage, average waiting and processing minutes, peak hours, cancellations, and settlements across date range. |
| `GET` | `/api/v1/analytics/forecast` | None | Predicts centre load percentage and warns if estimated volume exceeds capacity. |

---

## Unified Error Envelope

All API errors return standardized HTTP status codes and structured JSON payloads:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Selected slot is at full capacity"
  }
}
```

| Code | Status | Meaning |
|---|---|---|
| `AUTH_ERROR` | 401 | Missing, malformed, expired, or role-mismatched JWT access token. |
| `FORBIDDEN` | 403 | Authenticated operator attempting to access or modify resources of another centre. |
| `NOT_FOUND` | 404 | Resource does not exist or has been soft-deleted. |
| `CONFLICT` | 409 | Duplicate entity (e.g., slot already exists at that time, payment already initiated). |
| `VALIDATION_ERROR` | 422 | Invalid payload fields, date in the past, or slot overcapacity. |
| `RATE_LIMITED` | 429 | OTP resend frequency or attempt limit exceeded. |
| `INTERNAL_ERROR` | 500 | Unhandled server error (sanitized message returned). |

---

## SMS Channel Commands & Flows

Farmers can text the gateway phone number with standard commands or free-form messages:

| Command | Action |
|---|---|
| `HELP` | Returns the list of available commands. |
| `REGISTER` | Launches multi-step registration (Name → Pincode → Village → District → Confirmation). |
| `BOOK` | Interactive appointment booking (Crop → Quantity → Date → Centre selection → Slot selection). |
| `STATUS` | Checks current booking status, appointment date, and centre location. |
| `QUEUE` | Displays current position in the centre queue and estimated wait time. |
| `CENTRE` | Finds nearby procurement centres accepting crops based on the farmer's registered location. |
| `PAYMENT` | Shows payout settlement status and amount for completed procurements. |
| `HISTORY` | Summarizes past successful procurement records. |
| `CANCEL <REF>` | Cancels the specified booking and releases the slot for other farmers. |
| `RESCHEDULE <REF>` | Reschedules an existing appointment to a new date and time. |

---

## Security Audit & Invariants

During comprehensive backend auditing, the following invariants were verified and hardened:
1. **Constant-Time Cryptographic Equality:** All service keys and sensitive headers use `hmac.compare_digest` to prevent timing attacks.
2. **Strict Centre Multi-Tenancy:** Centre operators can only access queue, booking, procurement, payment, and audit stream entities matching their assigned `centre_id`.
3. **Database Token Integrity:** Tokens containing non-UUID subjects or invalid roles are caught at the dependency layer and rejected with `401 Unauthorized`, preventing database driver syntax crashes.
4. **Duplicate Payment Prevention:** Procurement payouts cannot be initiated more than once; concurrent requests are rejected with `409 Conflict`.
5. **No Secret Leaks:** Configuration, keys, and connection strings are managed strictly through environment variables.

---

## License

Built for the **Smart India Hackathon (SIH) 2026**.
All rights reserved.
