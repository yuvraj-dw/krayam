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

Krayam is an agricultural procurement platform that lets farmers sell their harvest to processing centres (mandis) the way they already communicate — by sending simple SMS messages from a basic feature phone — while offering the exact same real-time capabilities through modern web and mobile applications. Centre operators manage arrival queues, perform physical quality inspections, verify produce with dynamic price floors, process instant digital payments, and handle walk-ins effortlessly.

> **This repository** contains the core **backend API**, **SMS webhook & conversation engine**, **real-time SSE event bus**, and **offline PWA sync engine**. Frontends interface with this backend over 49 standardized REST & public endpoints, WebSocket-free Server-Sent Events (SSE), and cryptographic QR passes.

---

## Key Capabilities & Highlights

- **Dual Channel, Unified Business Engine:** Registration, booking, live queue, procurement, dynamic pricing, payment, and audit history function with 100% feature parity over both the REST API and plain SMS. An appointment booked via SMS immediately appears in the operator's queue, and changes at the centre dispatch instant SMS and in-app alerts.
- **Operator Walk-in System:** Mandi operators can search farmers on-the-spot (`GET /api/v1/operator/farmers/search`), register arriving farmers immediately (`POST /api/v1/operator/farmers`), and book walk-in procurement appointments (`POST /api/v1/operator/walk-in-bookings`) flagged with `is_walk_in: true` without advance slot reservations.
- **Dynamic Quality-Based Crop Pricing:** Produce is valued using quality grading (`Grade A`, `Fair Average Quality`, etc.) and variable unit pricing validated against server-side crop price bounds (`min_price <= unit_price <= max_price`). Payments are deterministically computed as `accepted_quantity * unit_price`.
- **Cryptographic Vector QR Passes & Public Web Vouchers:**
  - **Gate Passes (`/p/{booking_id}`):** Tamper-evident HMAC-SHA256 vector SVG QR gate passes viewable without login or app installation. Operators scan passes at the mandi gate (`POST /api/v1/operator/check-in/scan`) for instant verification.
  - **Delivery & Payment Receipts (`/r/{identifier}`):** Dedicated public settlement vouchers accessible by Payment ID, Procurement ID, or Booking ID, presenting the applied rate, grade, accepted quantity, and signed proof of payment.
- **Global SMS Conversation Controls & Gemini NLP:** Full priority handling for `CANCEL` (instantly resets in-flight session to idle without state leaks), `HELP` (shows command list while preserving conversation progress), and `HI` / `NAMASTE` (context-aware greetings for registered vs. unregistered farmers). In idle states, free-form Hindi/English SMS texts are parsed by **Gemini** into structured intents.
- **Transactional Outbox & Live SSE Streams:** State mutations write ordered events into `outbox_events` in the primary database transaction, immediately publishing to an in-memory event bus streamed over **Server-Sent Events (SSE)** (`/api/v1/events/stream` for operators, `/api/v1/events/me` for farmers) with automatic heartbeat and `Last-Event-ID` outbox catch-up.
- **Offline Mandi Centre Sync:** Progressive Web Apps (PWAs) at rural mandis can continue operations through network blackouts. Clients cache initial snapshots (`GET /sync/{centre_id}/snapshot`), execute weighbridge operations locally, and reconcile batched events (`POST /sync/{centre_id}/events`) with transactional optimistic concurrency checks.
- **Centralized In-App Notifications:** Persistent PostgreSQL notification storage (`notifications` table). Farmers can query their notification inbox, track unread counts, and mark alerts as read (`/api/v1/farmers/me/notifications`).
- **Predictive Analytics & Capacity Forecasting:** Per-centre metrics (`GET /api/v1/analytics/summary` and `/operator/analytics`) aggregate throughput, tonnage, wait times, cancellations, and payouts. A 7-day load forecast (`GET /api/v1/analytics/forecast`) alerts operators of anticipated overcapacity.
- **Strict Multi-Tenant Centre Isolation:** Operator operations are scoped strictly to their assigned `centre_id`. PBKDF2-SHA256 password hashing (100,000 iterations) and constant-time comparisons (`hmac.compare_digest`) ensure top-tier security.

---

## Architectural Diagram

```
  Farmers (Mobile App / Web PWA)             Feature-Phone Farmers (SMS)
               |  REST API + JWT Bearer                    |  Inbound SMS Webhook
               v                                           v
      /api/v1/*, /p/*, /r/*                          /sms/incoming
               +-----------------> Core Domain Services <----+
               |           (Booking, Slot, Queue, Payment,   |
               |            Procurement, Notification, QR)   |
               v                                             v
     PostgreSQL (Supabase)                        SMS Session & Audit Engine
  (Data, Outbox & Audit Logs)                     (Context, LLM Parser, Gate)
               |
               v
      Live Event Outbox Bus ───► Realtime SSE Streams (/events/stream, /events/me)
               |
               v
      Offline Sync Engine (/sync/{centre_id}/*)
```

> **AI Scope Note:** The *only* AI component in Krayam is the Gemini natural-language intent extractor in the SMS channel. Center recommendation scoring, wait-time estimation, payment calculation, fraud anomaly detection, capacity forecasting, SSE event broadcasting, and offline conflict resolution are completely deterministic, rule-based systems.

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Language / Runtime** | Python 3.10+, fully asynchronous (`asyncio`) |
| **Framework** | FastAPI + Pydantic v2 |
| **Database** | PostgreSQL · SQLAlchemy 2.0 Async ORM · asyncpg driver |
| **Database Migrations** | Alembic (`001_initial`, `002_outbox_operators`, `003_notifications`, `004_walkin_and_price_range`) |
| **Authentication** | SMS OTP (DB-stored with rate limiting & salt) · JWT (`python-jose`, HS256) |
| **Operator Passwords** | PBKDF2-SHA256 (100,000 iterations, stdlib `hashlib`) |
| **Realtime Streaming** | Server-Sent Events (SSE) backed by in-memory `asyncio.Queue` event bus |
| **Cryptographic QR** | HMAC-SHA256 signed payloads · Vector SVG output styled in agricultural emerald green |
| **SMS Gateway** | SMS Gate (Android SMS Gateway) inbound webhook + outbound REST client |
| **Natural Language** | Google Gemini via OpenAI-compatible endpoint (`openai` SDK, `gemini-2.5-flash`) |
| **Geolocation & Mandi Data** | `geopy` / Nominatim + India Pincode API |
| **Code Quality & Testing** | `ruff` (linter/formatter) · `mypy` (strict static typing) · `unittest` (async test suite) |

---

## Project Structure

```
SIH/
├── alembic/                      # Database schema migrations
│   ├── env.py
│   └── versions/                 # 001_initial, 002_outbox_operators, 003_notifications, 004_walkin_and_price_range
├── app/
│   ├── config.py                 # Pydantic Settings with .env loading & PUBLIC_URL
│   ├── database.py               # Async SQLAlchemy engine, session maker, base model
│   ├── dependencies.py           # FastAPI dependencies (auth, roles, centre scoping, token decoding)
│   ├── exceptions.py             # Standardized error envelope & handlers
│   ├── main.py                   # App lifecycle, CORS, /p/{booking_id}, and /r/{identifier} routes
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── booking.py            # Bookings, lifecycle statuses, is_walk_in flag
│   │   ├── centre.py             # Mandis & accepted crops with min/max price bounds
│   │   ├── event.py              # Audit events log
│   │   ├── farmer.py             # Farmers & OTP verifications
│   │   ├── notification.py       # Centralized in-app notification records
│   │   ├── operator.py           # Centre operators & auth
│   │   ├── outbox.py             # Outbox event log for realtime & offline sync
│   │   ├── payment.py            # Payments, unit rates, amounts, verification & anomalies
│   │   ├── procurement.py        # Produce intake, quality grades, unit prices
│   │   ├── queue.py              # Centre arrival queues & positions
│   │   ├── slot.py               # Time slots & dynamic booking capacity
│   │   └── sms.py                # SMS message logs & conversation sessions
│   ├── routers/
│   │   ├── sms/webhook.py        # /sms/incoming entry point & conversational state machine
│   │   └── v1/                   # REST endpoints (auth, bookings, operator, farmers, sync, etc.)
│   ├── schemas/                  # Pydantic validation schemas (analytics, operations, notification, qr)
│   └── services/                 # Core business services (booking, payment, procurement, notification, qr, outbox)
├── docs/                         # Integration guides and reference documentation
│   ├── backend-guide.md          # Complete Frontend & Integration Markdown Guide
│   ├── backend-guide.pdf         # Formatted PDF publication of technical guide
│   └── generate_pdf.py           # ReportLab automated PDF compilation script
├── tests/                        # Comprehensive automated test suite
│   ├── test_health.py            # Health & readiness checks
│   ├── test_auth.py              # OTP, login, security, role enforcement
│   ├── test_centres.py           # Centre CRUD, crop management, 404 validation
│   ├── test_slots.py             # Slot availability, full slot recovery
│   ├── test_bookings.py          # Booking creation, capacity locks, cancellation
│   ├── test_operator.py          # Operator queue, search, walk-ins, pricing bounds, payments, analytics
│   ├── test_notifications.py     # In-app notifications, lifecycle persistence, read receipts, multi-tenancy
│   ├── test_qr.py                # QR gate passes, SVG theme, operator scan check-in, public HTML view
│   ├── test_analytics.py         # Summary metrics & capacity forecasting
│   ├── test_events_sse.py        # SSE streams & authorization
│   ├── test_sync.py              # Offline sync snapshot, batch apply & cursor pull
│   ├── test_sms.py               # Webhook parsing, idempotency, global commands & live event publishing
│   ├── test_e2e_lifecycle.py     # Full End-to-End lifecycle tests (Section 43 REST & Section 44 SMS)
│   └── run_all.py                # Complete test runner harness
├── pyproject.toml                # Project metadata & tool configuration
├── alembic.ini                   # Alembic configuration
└── README.md
```

---

## Local Installation & Startup

### 1. Environment Setup
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

### 2. Configure Environment Variables
Create `.env` in the root folder (referenced from `.env.example`):
```ini
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/<dbname>
PUBLIC_URL=https://hizru.me

JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Operator Registration Secret
SUPABASE_SERVICE_KEY=<secret-key-for-operator-registration>

# SMS Gateway Integration
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

### 3. Run Database Migrations
```powershell
alembic upgrade head
```

### 4. Start the Application
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc Documentation: `http://127.0.0.1:8000/redoc`
- Health Check: `http://127.0.0.1:8000/api/v1/health`

### 5. Exposing SMS Webhook for Live Telephony Testing
```powershell
cloudflared tunnel run ResQ
```
Configure `https://hizru.me/sms/incoming` as the webhook URL in SMS Gate.

---

## Running Automated Tests

The test suite validates all routes, transactional boundaries, role enforcement, walk-ins, quality pricing, and SMS conversations:

```powershell
# Run the complete test suite
python tests/run_all.py

# Run comprehensive end-to-end integration tests
python -m unittest tests/test_e2e_lifecycle.py

# Static linting and type checking
python -m ruff check app/ tests/
python -m mypy app/ --no-incremental
```

---

## Complete API Reference (All 49 Endpoints)

All REST endpoints are rooted at **`/api/v1`**, complemented by public verification routes at **`/p`** and **`/r`**.

### Authentication & Profiles (`/auth`, `/farmers`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/otp/send` | None | Dispatches a 6-digit OTP to farmer's phone with rate limiting. |
| `POST` | `/api/v1/auth/otp/verify` | None | Verifies OTP code, returning JWT access token and `is_registered` status. |
| `POST` | `/api/v1/auth/register` | Pending Token | Completes profile onboarding for newly authenticated farmer. |
| `GET` | `/api/v1/farmers/me` | Farmer JWT | Retrieves authenticated farmer profile details and verification status. |
| `PUT` | `/api/v1/farmers/me` | Farmer JWT | Updates farmer profile (name, village, district, state, pincode, GPS coordinates). |
| `GET` | `/api/v1/farmers/me/notifications` | Farmer JWT | Lists persistent in-app notifications with unread counts and `?is_read=` filter. |
| `PATCH`| `/api/v1/farmers/me/notifications/{id}/read` | Farmer JWT | Marks a single notification as read. |
| `POST` | `/api/v1/farmers/me/notifications/read-all` | Farmer JWT | Marks all unread notifications in farmer's inbox as read. |

### Procurement Centres & Slots (`/centres`, `/slots`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/centres` | None | Lists active mandis with accepted crops and operating hours. |
| `POST` | `/api/v1/centres` | Operator JWT | Scaffolds a new procurement centre (hours, capacity, coordinates). |
| `GET` | `/api/v1/centres/{id}` | None | Retrieves specific mandi details and crop rate catalogue. |
| `PATCH`| `/api/v1/centres/{id}` | Operator JWT | Updates centre parameters (capacity, hours, coordinates). |
| `DELETE`|`/api/v1/centres/{id}` | Operator JWT | Soft-deactivates a centre (`is_active = false`). |
| `POST` | `/api/v1/centres/{id}/crops` | Operator JWT | Adds or updates accepted crop with rate, min price, and max price per unit. |
| `GET` | `/api/v1/slots` | None | Lists available booking windows and capacity remaining for a date. |
| `POST` | `/api/v1/slots` | Operator JWT | Creates a bookable capacity window (`start_time`, `end_time`, `max_bookings`). |

### Bookings & Digital Passes (`/bookings`, `/p`, `/r`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Farmer JWT | Creates an appointment booking. Validates capacity and emits outbox event. |
| `GET` | `/api/v1/bookings` | Farmer JWT | Lists upcoming and historical bookings for the authenticated farmer. |
| `POST` | `/api/v1/bookings/recommend` | Farmer JWT | Recommends mandis ranked by distance, crop acceptance, and load. |
| `GET` | `/api/v1/bookings/{id}` | Farmer JWT | Retrieves full booking record, appointment date, and status. |
| `GET` | `/api/v1/bookings/{id}/qr` | Farmer / Operator | Generates cryptographically signed emerald green vector SVG QR Gate Pass. |
| `POST` | `/api/v1/bookings/{id}/cancel` | Farmer JWT | Cancels booking, releases slot capacity, and emits cancellation event. |
| `POST` | `/api/v1/bookings/{id}/reschedule` | Farmer JWT | Reschedules booking date, centre, or slot, balancing capacity. |
| `GET` | `/p/{booking_id}` | Public | Responsive HTML digital gate pass viewable from SMS links without login. |
| `GET` | `/r/{identifier}` | Public | Public Delivery & Payment Receipt Voucher viewable by Payment, Procurement, or Booking ID. |

### Centre Operator Operations Suite (`/operator`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/operator/login` | None | Authenticates operator using phone + password, returning centre-scoped JWT. |
| `POST` | `/api/v1/operator/register` | Service Key | Provisions an operator account bound to a specific centre (`X-Service-Key`). |
| `GET` | `/api/v1/operator/dashboard` | Operator JWT | Real-time overview: today's bookings, queue depth, tonnage, payments, and sync watermark. |
| `GET` | `/api/v1/operator/bookings` | Operator JWT | Searches and filters centre bookings by farmer name, phone, crop, date, status, or slot. |
| `GET` | `/api/v1/operator/farmers/search` | Operator JWT | Searches farmer registry by phone, human ID (`F-...`), or name. |
| `POST` | `/api/v1/operator/farmers` | Operator JWT | Registers walk-in farmer on-the-spot without prior account creation. |
| `POST` | `/api/v1/operator/walk-in-bookings` | Operator JWT | Creates instant walk-in booking flagged with `is_walk_in: true`. |
| `POST` | `/api/v1/operator/check-in` | Operator JWT | Checks in arriving farmer by booking ID, assigning ordered queue position. |
| `POST` | `/api/v1/operator/check-in/scan` | Operator JWT | Scans digital QR Gate Pass, validates HMAC signature, and checks in farmer automatically. |
| `GET` | `/api/v1/operator/queue/{centre_id}` | Operator JWT | Returns live waiting queue state, current position, and wait estimates. |
| `POST` | `/api/v1/operator/call-next` | Operator JWT | Advances queue: marks next waiting farmer as called and dispatches SMS alert. |
| `POST` | `/api/v1/operator/queue/{id}/start` | Operator JWT | Marks weighbridge and inspection processing as started. |
| `POST` | `/api/v1/operator/queue/{id}/complete` | Operator JWT | Marks processing complete and cleans up the queue entry. |
| `POST` | `/api/v1/operator/queue/{id}/no-show` | Operator JWT | Marks unarrived booking as no-show and re-sequences the queue. |
| `POST` | `/api/v1/operator/procurements` | Operator JWT | Records accepted quantity, unit, quality grade, and validates `unit_price` bounds. |
| `GET` | `/api/v1/operator/procurements/{id}/qr` | Operator JWT | Returns signed vector SVG QR procurement delivery receipt and payment slip. |
| `GET` | `/api/v1/operator/procurements/{id}/review` | Operator JWT | Returns payment review payload with anti-fraud anomaly detection flags. |
| `POST` | `/api/v1/operator/procurements/{id}/payment` | Operator JWT | Initiates payment calculated as `accepted_quantity * unit_price`. |
| `GET` | `/api/v1/operator/payments` | Operator JWT | Lists payments for centre with anomaly warnings, date filtering, and pagination. |
| `POST` | `/api/v1/operator/payments/{id}/verify` | Operator JWT | Operator verifies or rejects payment settlement after audit check. |
| `GET` | `/api/v1/operator/analytics` | Operator JWT | Historical centre metrics (farmers served, tonnage, wait times, cancellations, payment totals). |
| `GET` | `/api/v1/operator/events/{type}/{id}` | Operator JWT | Retrieves immutable audit event history for an entity within operator's centre. |

### Real-Time Streaming & Offline Sync (`/events`, `/sync`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/events/stream?centre_id=` | Operator JWT | SSE connection streaming live centre events with replay via `Last-Event-ID`. |
| `GET` | `/api/v1/events/me` | Farmer JWT | SSE connection streaming personal booking, queue, and payment updates. |
| `GET` | `/api/v1/sync/{centre_id}/snapshot` | Operator JWT | Downloads full offline snapshot: centre data, crops, active slots, today's bookings, and waitlist. |
| `GET` | `/api/v1/sync/{centre_id}/events?cursor=` | Operator JWT | Pulls incremental mutations occurring after `cursor` for offline client catch-up. |
| `POST` | `/api/v1/sync/{centre_id}/events` | Operator JWT | Submits batch of offline-generated events. Idempotently reconciles with deduplication. |

### Predictive Analytics (`/analytics`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/summary` | None | Aggregates throughput, tonnage, average wait times, peak hours, and cancellations. |
| `GET` | `/api/v1/analytics/forecast` | None | 7-day algorithmic harvest inflow forecast with proactive overload warnings. |

### SMS Telephony Gateway (`/sms`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/sms/incoming` | None | Webhook endpoint receiving inbound SMS messages from telephony gateway. |

---

## SMS Channel Commands & Conversations

Farmers can text the gateway phone number with structured commands or conversational queries:

| Command | Behavior |
|---|---|
| `CANCEL` | **Global Control**: Resets active multi-step conversation to `idle` without partial writes. |
| `HELP` | **Global Control**: Dispatches command manual while strictly preserving in-flight session state. |
| `HI` / `NAMASTE` | **Global Greeting**: Greets registered farmers with action shortcuts (`BOOK`, `STATUS`), and directs unregistered farmers to register. |
| `REGISTER` | Interactive registration flow: Name → Pincode → Village → District → Confirmation. |
| `BOOK` | Conversational slot booking: Crop → Quantity → Date → Centre selection → Confirmation. |
| `STATUS` | Checks current booking status, appointment date, and centre location. |
| `QUEUE` | Displays current position in the centre queue and estimated wait time. |
| `CENTRE` | Finds nearby procurement centres accepting crops based on farmer's location. |
| `PAYMENT` | Shows payout settlement status and amount for completed procurements. |
| `HISTORY` | Summarizes past successful procurement records. |
| `RESCHEDULE <REF>` | Reschedules an existing appointment to a new date. |

---

## Security Invariants & Audit Guarantees

1. **Strict Centre Multi-Tenancy:** All operator endpoints enforce `operator.centre_id` isolation, returning `403 Forbidden` on mismatched access.
2. **Server-Side Price Range Enforcement:** Procurements validate that `min_price <= unit_price <= max_price`. Sub-MSP rates are rejected with `422 ValidationError`.
3. **Constant-Time Cryptographic Equality:** All service keys and sensitive headers use `hmac.compare_digest` to eliminate timing side-channels.
4. **Duplicate Payment Prevention:** Procurement payouts cannot be initiated more than once; concurrent requests are rejected with `409 Conflict`.
5. **Deterministic Calculation:** Payout amounts are strictly computed on the backend (`accepted_quantity * unit_price`), preventing client tampering.
6. **Zero Phone Number Leakage:** Test phone numbers and production API secrets are strictly shielded from public documentation and source code.

---

## License

Built for the **Smart India Hackathon (SIH) 2026**.  
All rights reserved.
