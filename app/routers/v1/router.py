from fastapi import APIRouter

from app.routers.v1.analytics import router as analytics_router
from app.routers.v1.auth import router as auth_router
from app.routers.v1.bookings import router as bookings_router
from app.routers.v1.centres import router as centres_router
from app.routers.v1.events import router as events_router
from app.routers.v1.farmers import router as farmers_router
from app.routers.v1.health import router as health_router
from app.routers.v1.operator import router as operator_router
from app.routers.v1.slots import router as slots_router
from app.routers.v1.sync import router as sync_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(farmers_router)
api_v1_router.include_router(centres_router)
api_v1_router.include_router(slots_router)
api_v1_router.include_router(bookings_router)
api_v1_router.include_router(operator_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(sync_router)
