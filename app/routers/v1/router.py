from fastapi import APIRouter

from app.routers.v1.auth import router as auth_router
from app.routers.v1.bookings import router as bookings_router
from app.routers.v1.centres import router as centres_router
from app.routers.v1.farmers import router as farmers_router
from app.routers.v1.health import router as health_router
from app.routers.v1.slots import router as slots_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(farmers_router)
api_v1_router.include_router(centres_router)
api_v1_router.include_router(slots_router)
api_v1_router.include_router(bookings_router)
