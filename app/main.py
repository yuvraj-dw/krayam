from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy import select
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


@app.get("/p/{booking_id}", response_class=HTMLResponse)
async def public_gate_pass(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
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
