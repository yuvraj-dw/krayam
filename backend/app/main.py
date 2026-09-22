from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import collections

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import engine, get_db
from app.exceptions import register_exception_handlers
from app.models.booking import Booking
from app.models.centre import Centre
from app.models.farmer import Farmer
from app.routers.sms.webhook import router as sms_router
from app.routers.v1.router import api_v1_router
from app.services.bus import bus
from app.services.qr import qr_service

settings = get_settings()

# In-memory IP rate limiter for public gate pass and receipt routes (30 req / 60s window)
_RATE_LIMIT_BUCKET: dict[str, collections.deque[float]] = collections.defaultdict(collections.deque)
_RATE_LIMIT_WINDOW = 60.0
_RATE_LIMIT_MAX = 30


def check_public_rate_limit(request: Request) -> None:
    client_ip = (request.client.host if request.client else "unknown")
    now = datetime.now(timezone.utc).timestamp()
    history = _RATE_LIMIT_BUCKET[client_ip]
    while history and history[0] < now - _RATE_LIMIT_WINDOW:
        history.popleft()
    if len(history) >= _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too Many Requests. Please try again in a minute.")
    history.append(now)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await bus.close()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(sms_router)


from app.models.procurement import Procurement
from app.models.payment import Payment

@app.get("/p/{booking_id}", response_class=HTMLResponse)
async def public_gate_pass(
    request: Request,
    booking_id: str,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    check_public_rate_limit(request)
    stmt = select(Booking).where(Booking.booking_id == booking_id.strip().upper())
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        return HTMLResponse(
            "<h3>Pass not found</h3>",
            status_code=404,
            media_type="text/html",
        )

    farmer_stmt = select(Farmer).where(Farmer.id == booking.farmer_id)
    farmer_res = await db.execute(farmer_stmt)
    farmer = farmer_res.scalar_one_or_none()

    centre_name = "Krayam Centre"
    if booking.centre_id:
        c_stmt = select(Centre.name).where(Centre.id == booking.centre_id)
        c_res = await db.execute(c_stmt)
        c_val = c_res.scalar_one_or_none()
        if c_val:
            centre_name = c_val

    if not farmer:
        return HTMLResponse(
            "<h3>Farmer record not found</h3>",
            status_code=404,
            media_type="text/html",
        )

    html_content = qr_service.render_public_pass_html(booking, farmer, centre_name)
    return HTMLResponse(content=html_content, media_type="text/html")


@app.get("/r/{identifier}", response_class=HTMLResponse)
async def public_procurement_receipt(
    request: Request,
    identifier: str,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    check_public_rate_limit(request)
    clean_id = identifier.strip()

    # Match by payment_id, procurement_id, or booking_id
    stmt = (
        select(Procurement, Booking, Farmer, Payment)
        .join(Booking, Procurement.booking_id == Booking.id)
        .join(Farmer, Booking.farmer_id == Farmer.id)
        .outerjoin(Payment, Payment.procurement_id == Procurement.id)
        .where(
            or_(
                Procurement.procurement_id == clean_id.upper(),
                Booking.booking_id == clean_id.upper(),
                Payment.payment_id == clean_id.upper(),
            )
        )
        .order_by(Procurement.created_at.desc())
        .limit(1)
    )

    res = await db.execute(stmt)
    row = res.first()

    if not row:
        return HTMLResponse(
            "<h3>Procurement or Payment Receipt not found</h3>",
            status_code=404,
            media_type="text/html",
        )

    procurement, booking, farmer, payment = row

    centre_name = "Krayam Centre"
    if booking.centre_id:
        c_stmt = select(Centre.name).where(Centre.id == booking.centre_id)
        c_res = await db.execute(c_stmt)
        c_val = c_res.scalar_one_or_none()
        if c_val:
            centre_name = c_val

    html_content = qr_service.render_public_receipt_html(
        procurement=procurement,
        booking=booking,
        farmer=farmer,
        centre_name=centre_name,
        payment=payment,
    )
    return HTMLResponse(content=html_content, media_type="text/html")

