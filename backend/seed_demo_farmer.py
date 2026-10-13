import asyncio
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.models.centre import Centre, CentreCrop
from app.models.farmer import Farmer
from app.models.payment import Payment, PaymentStatus
from app.models.procurement import Procurement
from app.models.slot import Slot
from app.utils.security import hash_password

DEMO_PHONE = "9876543200"
DEMO_PASSWORD = "Password123!"
DEMO_FARMER_ID = "F-MH-DEMO-01"
LASALGAON_CENTRE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
UPCOMING_BOOKING_ID = "BK-DEMO-UPCOMING"
PAST_BOOKING_ID = "BK-DEMO-PAST"
PAST_PROCUREMENT_ID = "PRC-DEMO-PAST"
PAST_PAYMENT_ID = "PAY-DEMO-PAST"


async def clean_existing_demo_farmer(db: AsyncSession) -> None:
    """Purge prior demo farmer records cleanly and idempotently."""
    await db.execute(
        text(
            "UPDATE slots SET current_bookings = GREATEST(current_bookings - 1, 0), is_available = true "
            "WHERE id IN ("
            "    SELECT slot_id FROM bookings WHERE slot_id IS NOT NULL AND ("
            "        booking_id IN (:b1, :b2) OR farmer_id IN ("
            "            SELECT id FROM farmers WHERE phone = :p OR farmer_id = :fid"
            "        )"
            "    )"
            ")"
        ),
        {"b1": UPCOMING_BOOKING_ID, "b2": PAST_BOOKING_ID, "p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.execute(
        text(
            "DELETE FROM payments WHERE payment_id = :pid "
            "OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p OR farmer_id = :fid)"
        ),
        {"pid": PAST_PAYMENT_ID, "p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.execute(
        text(
            "DELETE FROM procurements WHERE procurement_id = :prcid "
            "OR booking_id IN (SELECT id FROM bookings WHERE farmer_id IN ("
            "    SELECT id FROM farmers WHERE phone = :p OR farmer_id = :fid"
            "))"
        ),
        {"prcid": PAST_PROCUREMENT_ID, "p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.execute(
        text(
            "DELETE FROM queue_entries WHERE booking_id IN ("
            "    SELECT id FROM bookings WHERE booking_id IN (:b1, :b2) "
            "    OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p OR farmer_id = :fid)"
            ")"
        ),
        {"b1": UPCOMING_BOOKING_ID, "b2": PAST_BOOKING_ID, "p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.execute(
        text(
            "DELETE FROM bookings WHERE booking_id IN (:b1, :b2) "
            "OR farmer_id IN (SELECT id FROM farmers WHERE phone = :p OR farmer_id = :fid)"
        ),
        {"b1": UPCOMING_BOOKING_ID, "b2": PAST_BOOKING_ID, "p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.execute(
        text(
            "DELETE FROM outbox_events WHERE farmer_id IN ("
            "    SELECT id FROM farmers WHERE phone = :p OR farmer_id = :fid"
            ")"
        ),
        {"p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.execute(
        text("DELETE FROM notifications WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM sms_messages WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM sms_sessions WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM otps WHERE phone = :p"),
        {"p": DEMO_PHONE},
    )
    await db.execute(
        text("DELETE FROM farmers WHERE phone = :p OR farmer_id = :fid"),
        {"p": DEMO_PHONE, "fid": DEMO_FARMER_ID},
    )
    await db.commit()


async def seed_demo_farmer(db: AsyncSession | None = None) -> dict[str, str]:
    """Seed Ramesh Patel demo farmer and full showcase lifecycle data."""
    if db is None:
        async with async_session_factory() as session:
            return await _seed_with_session(session)
    return await _seed_with_session(db)


async def _seed_with_session(db: AsyncSession) -> dict[str, str]:
    await clean_existing_demo_farmer(db)

    # Ensure APMC Lasalgaon Centre exists
    centre = (
        await db.execute(
            select(Centre).where(Centre.id == LASALGAON_CENTRE_ID)
        )
    ).scalar_one_or_none()

    if not centre:
        centre = Centre(
            id=LASALGAON_CENTRE_ID,
            name="APMC Lasalgaon Mandi",
            code="MH-LASAL-01",
            address="Main Market Yard, Lasalgaon",
            village="Lasalgaon",
            district="Nashik",
            state="Maharashtra",
            latitude=20.1478,
            longitude=74.2255,
            capacity=200,
            operating_start=time(8, 0),
            operating_end=time(18, 0),
            is_active=True,
        )
        db.add(centre)
        for crop_name, rate, min_p, max_p in [
            ("Onion", 1850.0, 1600.0, 2200.0),
            ("Wheat", 2275.0, 2200.0, 2400.0),
            ("Soybean", 4892.0, 4600.0, 5200.0),
            ("Maize", 2090.0, 1950.0, 2200.0),
        ]:
            db.add(
                CentreCrop(
                    centre_id=LASALGAON_CENTRE_ID,
                    crop_name=crop_name,
                    rate_per_unit=rate,
                    min_price_per_unit=min_p,
                    max_price_per_unit=max_p,
                )
            )
        await db.flush()

    # Create Demo Farmer
    farmer_uuid = uuid.uuid4()
    farmer = Farmer(
        id=farmer_uuid,
        name="Ramesh Patel",
        phone=DEMO_PHONE,
        farmer_id=DEMO_FARMER_ID,
        password_hash=hash_password(DEMO_PASSWORD),
        village="Lasalgaon",
        district="Nashik",
        state="Maharashtra",
        pincode="422306",
        latitude=20.1478,
        longitude=74.2255,
        is_verified=True,
        is_active=True,
    )
    db.add(farmer)
    await db.flush()

    # Ensure slot exists for tomorrow
    tomorrow = date.today() + timedelta(days=1)
    slot = (
        await db.execute(
            select(Slot).where(
                Slot.centre_id == LASALGAON_CENTRE_ID,
                Slot.date == tomorrow,
                Slot.start_time == time(10, 0),
            )
        )
    ).scalars().first()

    if not slot:
        slot = Slot(
            id=uuid.uuid4(),
            centre_id=LASALGAON_CENTRE_ID,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(12, 0),
            max_bookings=25,
            current_bookings=0,
            is_available=True,
        )
        db.add(slot)
        await db.flush()

    # 1. Active Upcoming Booking (Tomorrow)
    upcoming_uuid = uuid.uuid4()
    upcoming_booking = Booking(
        id=upcoming_uuid,
        booking_id=UPCOMING_BOOKING_ID,
        farmer_id=farmer_uuid,
        centre_id=LASALGAON_CENTRE_ID,
        slot_id=slot.id,
        crop="Soybean",
        quantity=25.0,
        unit="quintal",
        expected_date=tomorrow,
        is_walk_in=False,
        status=BookingStatus.CONFIRMED,
    )
    db.add(upcoming_booking)
    await db.flush()

    # Recount slot.current_bookings to avoid counter drift
    booking_count = await db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.slot_id == slot.id,
            Booking.status.notin_(
                [BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.NO_SHOW]
            ),
        )
    )
    slot.current_bookings = int(booking_count or 0)
    slot.is_available = slot.current_bookings < slot.max_bookings

    # 2. Past Completed Booking (3 days ago)
    past_date = date.today() - timedelta(days=3)
    past_booking_uuid = uuid.uuid4()
    past_booking = Booking(
        id=past_booking_uuid,
        booking_id=PAST_BOOKING_ID,
        farmer_id=farmer_uuid,
        centre_id=LASALGAON_CENTRE_ID,
        crop="Wheat",
        quantity=40.0,
        unit="quintal",
        expected_date=past_date,
        is_walk_in=False,
        status=BookingStatus.COMPLETED,
    )
    db.add(past_booking)
    await db.flush()

    # Past Procurement Intake
    procurement_uuid = uuid.uuid4()
    procurement = Procurement(
        id=procurement_uuid,
        procurement_id=PAST_PROCUREMENT_ID,
        booking_id=past_booking_uuid,
        accepted_quantity=40.0,
        unit_price=2275.0,
        quality_grade="Grade A (Clean, <10% moisture)",
        unit="quintal",
        quality_notes="High quality grain verified at intake weighbridge.",
        processing_start=datetime.combine(past_date, time(9, 30), tzinfo=timezone.utc),
        processing_end=datetime.combine(past_date, time(10, 15), tzinfo=timezone.utc),
        status="completed",
    )
    db.add(procurement)
    await db.flush()

    # Past Payment Record
    payment_uuid = uuid.uuid4()
    payment = Payment(
        id=payment_uuid,
        payment_id=PAST_PAYMENT_ID,
        procurement_id=procurement_uuid,
        farmer_id=farmer_uuid,
        quantity=40.0,
        rate=2275.0,
        amount=91000.0,
        status=PaymentStatus.CONFIRMED,
        verified_by="Operator - APMC Lasalgaon",
        verified_at=datetime.combine(past_date, time(10, 20), tzinfo=timezone.utc),
        confirmed_at=datetime.combine(past_date, time(10, 30), tzinfo=timezone.utc),
    )
    db.add(payment)

    await db.commit()

    return {
        "farmer_id": DEMO_FARMER_ID,
        "name": "Ramesh Patel",
        "phone": DEMO_PHONE,
        "password": DEMO_PASSWORD,
        "upcoming_booking": UPCOMING_BOOKING_ID,
        "past_booking": PAST_BOOKING_ID,
        "past_payment": PAST_PAYMENT_ID,
    }


if __name__ == "__main__":
    res = asyncio.run(seed_demo_farmer())
    print("Demo farmer successfully seeded:")
    for k, v in res.items():
        print(f"  {k}: {v}")
