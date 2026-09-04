from fastapi import APIRouter

from app.routers.v1.auth import router as auth_router
from app.routers.v1.farmers import router as farmers_router
from app.routers.v1.health import router as health_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(farmers_router)
