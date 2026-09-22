import asyncio
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import text
from app.database import async_session_factory
from app.models.centre import Centre, CentreCrop
from app.models.slot import Slot
from app.models.operator import Operator
from app.services.operator import hash_password

async def clean_and_seed():
    async with async_session_factory() as db:
        print("1. Cleaning up farmers, bookings, queue, procurements, payments, notifications...")
        # Clean in foreign key dependency order
        cleanup_queries = [
            "DELETE FROM outbox_events",
            "DELETE FROM payments",
            "DELETE FROM procurements",
            "DELETE FROM queue_entries",
            "DELETE FROM bookings",
            "DELETE FROM notifications",
            "DELETE FROM sms_messages",
            "DELETE FROM sms_sessions",
            "DELETE FROM otps",
            "DELETE FROM farmers",
            "DELETE FROM operators",
            "DELETE FROM slots",
            "DELETE FROM centre_crops",
            "DELETE FROM centres",
        ]
        for q in cleanup_queries:
            await db.execute(text(q))
        await db.commit()
        print("Database wiped clean!")

        print("2. Seeding major Mandis / Procurement Centres across India...")
        centres_data = [
            {
                "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "name": "APMC Lasalgaon Mandi",
                "code": "MH-LASAL-01",
                "address": "Main Market Yard, Lasalgaon",
                "village": "Lasalgaon",
                "district": "Nashik",
                "state": "Maharashtra",
                "latitude": 20.1478,
                "longitude": 74.2255,
                "capacity": 200,
                "operating_start": time(8, 0),
                "operating_end": time(18, 0),
                "crops": [
                    ("Onion", 1850.0, 1600.0, 2200.0),
                    ("Wheat", 2275.0, 2200.0, 2400.0),
                    ("Soybean", 4892.0, 4600.0, 5200.0),
                    ("Maize", 2090.0, 1950.0, 2200.0),
                ]
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
                "name": "Khanna Grain Market (Asia's Largest)",
                "code": "PB-KHANNA-01",
                "address": "GT Road, Grain Market, Khanna",
                "village": "Khanna",
                "district": "Ludhiana",
                "state": "Punjab",
                "latitude": 30.7068,
                "longitude": 76.2201,
                "capacity": 350,
                "operating_start": time(7, 30),
                "operating_end": time(19, 0),
                "crops": [
                    ("Wheat", 2275.0, 2250.0, 2350.0),
                    ("Paddy (Basmati)", 3800.0, 3500.0, 4200.0),
                    ("Paddy (Common)", 2203.0, 2183.0, 2250.0),
                    ("Mustard", 5650.0, 5400.0, 5900.0),
                ]
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                "name": "Indore Krishi Upaj Mandi (Choithram)",
                "code": "MP-INDORE-01",
                "address": "Choithram Square, Manikbagh Road, Indore",
                "village": "Indore",
                "district": "Indore",
                "state": "Madhya Pradesh",
                "latitude": 22.6868,
                "longitude": 75.8456,
                "capacity": 250,
                "operating_start": time(8, 30),
                "operating_end": time(17, 30),
                "crops": [
                    ("Soybean", 4892.0, 4700.0, 5100.0),
                    ("Wheat (Sharbati)", 2850.0, 2600.0, 3200.0),
                    ("Gram (Chana)", 5440.0, 5200.0, 5700.0),
                    ("Garlic", 6500.0, 5000.0, 9000.0),
                ]
            },
            {
                "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
                "name": "Karnal APMC Grain Mandi",
                "code": "HR-KARNAL-01",
                "address": "New Anaj Mandi, Karnal",
                "village": "Karnal",
                "district": "Karnal",
                "state": "Haryana",
                "latitude": 29.6857,
                "longitude": 76.9905,
                "capacity": 220,
                "operating_start": time(8, 0),
                "operating_end": time(18, 0),
                "crops": [
                    ("Wheat", 2275.0, 2200.0, 2350.0),
                    ("Basmati Rice", 4100.0, 3800.0, 4400.0),
                    ("Mustard", 5650.0, 5450.0, 5800.0),
                ]
            }
        ]

        today = date.today()
        # Seed slots for 7 days ahead
        for c in centres_data:
            centre = Centre(
                id=c["id"],
                name=c["name"],
                code=c["code"],
                address=c["address"],
                village=c["village"],
                district=c["district"],
                state=c["state"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                capacity=c["capacity"],
                operating_start=c["operating_start"],
                operating_end=c["operating_end"],
                is_active=True,
            )
            db.add(centre)

            for crop_name, rate, min_p, max_p in c["crops"]:
                crop = CentreCrop(
                    id=uuid.uuid4(),
                    centre_id=c["id"],
                    crop_name=crop_name,
                    rate_per_unit=rate,
                    min_price_per_unit=min_p,
                    max_price_per_unit=max_p,
                    unit="quintal",
                    is_active=True,
                )
                db.add(crop)

            # Add demo operator for each centre
            # Lasalgaon: 9876543210 / Password123!
            # Khanna:    9876543211 / Password123!
            # Indore:    9876543212 / Password123!
            # Karnal:    9876543213 / Password123!
            op_index = centres_data.index(c)
            op_phone = f"987654321{op_index}"
            operator = Operator(
                id=uuid.uuid4(),
                name=f"Operator - {c['name'].split()[0]}",
                phone=op_phone,
                password_hash=hash_password("Password123!"),
                centre_id=c["id"],
                is_active=True,
            )
            db.add(operator)

            # Generate slots for next 10 days covering entire operating day
            slot_times = [
                (time(8, 0), time(10, 0)),
                (time(10, 0), time(12, 0)),
                (time(12, 0), time(14, 0)),
                (time(14, 0), time(16, 0)),
                (time(16, 0), time(18, 0)),
            ]
            for day_offset in range(10):
                slot_date = today + timedelta(days=day_offset)
                for start_t, end_t in slot_times:
                    slot = Slot(
                        id=uuid.uuid4(),
                        centre_id=c["id"],
                        date=slot_date,
                        start_time=start_t,
                        end_time=end_t,
                        max_bookings=25,
                        current_bookings=0,
                        is_available=True,
                    )
                    db.add(slot)

        await db.commit()
        print("Database seeded successfully with 4 Major Mandis, Crops, Slots, and Mandi Operators!")

if __name__ == "__main__":
    import sys
    if "--force" not in sys.argv:
        print("SAFETY WARNING: This script will WIPE all farmers, bookings, and payments from the DB.")
        print("To run, provide the '--force' flag: python seed_data.py --force")
        sys.exit(1)
    asyncio.run(clean_and_seed())
