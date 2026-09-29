# Krayam

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini%20NLP-886CE4?logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![SIH 2026](https://img.shields.io/badge/SIH-2026-1E8449)](https://www.sih.gov.in/)

**Smart India Hackathon 2026**

**Krayam** is an intelligent agricultural procurement platform bridging rural mandi operations and farmers. It provides an omnichannel experience: farmers can book slots, receive digital gate passes, and track queue tokens through either a modern **React web app** or low-cost **GSM SMS** on basic feature phones. Mandi centre operators manage gate check-ins, record produce weighment, verify quality grades, and initiate direct bank payouts in real time.

---

## Product Tour & Walkthrough

<p align="center">
  <img src="assets/krayam-preview.gif" alt="Krayam Architecture & Product Walkthrough" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" />
</p>

---

## Repository Structure

```
krayam/
├── frontend/             # Farmer Web App & Mandi Operator Portal (React 19 + Vite + TypeScript + Tailwind)
├── backend/              # Core API Server (FastAPI + SQLAlchemy 2.0 Async + PostgreSQL + Alembic)
│   ├── app/              # Routers, business services, models, and SMS webhook engine
│   ├── alembic/          # Database migrations (001 through 006)
│   └── tests/            # Automated test suite (52+ passing tests)
├── docs/                 # Architecture, security audit, and frontend integration guides
└── docs/diagrams/        # Interactive SVG/HTML system architecture & workflow diagrams
```

---

## Key Features

- **Dual-Channel Farmer Experience:** Full feature parity across modern Web UI and plain SMS (with Google Gemini NLP intent extraction for natural Hinglish messages).
- **Flexible Farmer Authentication:** Register with mobile OTP + password; log in using either password or OTP.
- **Mandi Operator Portal:** Fast gate pass QR scanning, queue management, walk-in farmer registration, and quality-grade weighment recording.
- **Cryptographic Passes & Vouchers:** Tamper-evident HMAC-SHA256 vector SVG QR gate passes (`/p/{booking_id}`) and payment receipts (`/r/{identifier}`) accessible without login.
- **Realtime Yard Tracking:** Server-Sent Events (SSE) feed live queue updates to gate boards without browser polling.
- **Offline Resilient:** Local client queue buffers allow mandi terminals to capture intake operations during rural network outages and auto-sync on recovery.

---

## Quickstart

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows: .\venv\Scripts\activate | On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Run test suite:
```bash
python -m pytest tests/ -v
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`. Configure `VITE_API_URL` in `frontend/.env` to point to the backend (e.g. `http://localhost:8000/api/v1` or production `https://hizru.me/api/v1`).

---

## Tech Stack

| Component | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet Maps |
| **Backend** | FastAPI, Python 3.10+, Pydantic v2, SQLAlchemy 2.0 Async, asyncpg |
| **Database** | PostgreSQL (Supabase) + Alembic migrations |
| **Security & Auth** | PBKDF2-HMAC-SHA256, JWT (`python-jose`), SMS Gate OTP |
| **AI / NLP** | Google Gemini (`gemini-2.5-flash` / `gemini-3-flash`) for SMS parsing |
| **Streaming** | Server-Sent Events (SSE) via in-memory bounded event bus |

---

## Documentation

- **System Architecture & Workflows:** Interactive diagrams located in `docs/diagrams/` (`krayam-architecture.html`, `krayam-booking-sequence.html`, `krayam-offline-sync.html`).
- **Frontend Password Integration:** `docs/FRONTEND_PASSWORD_INTEGRATION.md`
- **Security Audit Reports:** `~/security-audit-skill/krayam/run-1/`
