import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_farmer
from app.exceptions import AuthorizationError
from app.models.booking import Booking
from app.models.farmer import Farmer
from app.schemas.procurement import (
    BookingCreate,
    BookingReschedule,
    BookingResponse,
    RecommendedCentre,
)
from app.services.booking import booking_service
from app.services.recommendation import recommendation_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(
    body: BookingCreate,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    return BookingResponse.model_validate(
        await booking_service.create(
            db,
            farmer_id=farmer.id,
            crop=body.crop,
            quantity=body.quantity,
            expected_date=body.expected_date,
            unit=body.unit,
            centre_id=body.centre_id,
            slot_id=body.slot_id,
        )
    )


@router.get("", response_model=list[BookingResponse])
async def list_my_bookings(
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> list[Booking]:
    return [
        BookingResponse.model_validate(b)
        for b in await booking_service.list_for_farmer(db, farmer.id)
    ]


@router.post("/recommend", response_model=list[RecommendedCentre])
async def recommend_centres(
    crop: str = Query(...),
    expected_date: date = Query(...),
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> list[RecommendedCentre]:
    lat = farmer.latitude
    lng = farmer.longitude
    if not lat or not lng:
        lat, lng = 20.5937, 78.9629  # India centre fallback
    return await recommendation_service.recommend(
        db,
        crop=crop,
        expected_date=expected_date,
        farmer_lat=lat,
        farmer_lng=lng,
        pincode=farmer.pincode,
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    booking = await booking_service.get_by_id(db, booking_id)
    if booking.farmer_id != farmer.id:
        raise AuthorizationError("Not your booking")
    return BookingResponse.model_validate(booking)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    booking = await booking_service.get_by_id(db, booking_id)
    if booking.farmer_id != farmer.id:
        raise AuthorizationError("Not your booking")
    return BookingResponse.model_validate(await booking_service.cancel(db, booking))


@router.post("/{booking_id}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    booking_id: uuid.UUID,
    body: BookingReschedule,
    farmer: Farmer = Depends(get_current_farmer),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    booking = await booking_service.get_by_id(db, booking_id)
    if booking.farmer_id != farmer.id:
        raise AuthorizationError("Not your booking")
    return BookingResponse.model_validate(await booking_service.reschedule(db, booking, body))
