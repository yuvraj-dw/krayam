"""Seed demo procurement centres + slots so the SMS BOOK flow returns results.

Idempotent: skips centres whose code already exists, and skips slots already
created for a centre/date/start_time. Run manually, not on app startup:

    python -m scripts.seed_sms_demo

Remove any demo rows later with a simple DELETE from centres where code in (...).
"""

import asyncio
from datetime import date, time, timedelta

from sqlalchemy import select

from app.database import async_session_factory
from app.models.slot import Slot
from app.schemas.procurement import CentreCreate, CentreCropCreate, SlotCreate
from app.services.centre import centre_service
from app.services.slot import slot_service

# Demo centres around Bhopal (found live via the CENTRE command).
DEMO_CENTRES = [
    {
        "name": "Galla Mandi Bhopal",
        "code": "GMB",
        "address": "Near Railway Station, Bhopal",
        "village": "Bhopal",
        "district": "Bhopal",
        "state": "Madhya Pradesh",
        "latitude": 23.2599,
        "longitude": 77.4126,
        "capacity": 50,
    },
    {
        "name": "Sabzi Mandi Bhopal",
        "code": "SMB",
        "address": "Old Sabzi Mandi, Bhopal",
        "village": "Bhopal",
        "district": "Bhopal",
        "state": "Madhya Pradesh",
        "latitude": 23.2657,
        "longitude": 77.4001,
        "capacity": 40,
    },
    {
        "name": "Kisan Mandi Bhopal",
        "code": "KMB",
        "address": "Kolar Road, Bhopal",
        "village": "Bhopal",
        "district": "Bhopal",
        "state": "Madhya Pradesh",
        "latitude": 23.1657,
        "longitude": 77.4578,
        "capacity": 60,
    },
]

# Common procurement crops the demo centres accept.
CROPS = [
    ("Wheat", 2200.0),
    ("Soybean", 4800.0),
    ("Gram", 5200.0),
    ("Maize", 1850.0),
]

SLOT_TIMES = [(time(9, 0), time(11, 0)), (time(11, 0), time(13, 0)), (time(13, 0), time(15, 0))]


async def seed() -> None:
    async with async_session_factory() as db:
        for spec in DEMO_CENTRES:
            existing = await centre_service.get_by_code(db, spec["code"])
            if existing:
                centre = existing
            else:
                centre = await centre_service.create(
                    db, CentreCreate(**{k: spec[k] for k in spec if k != "crops"})
                )
                for crop, rate in CROPS:
                    await centre_service.add_crop(
                        db, centre.id, CentreCropCreate(crop_name=crop, rate_per_unit=rate)
                    )
                await db.flush()
                print(f"Created centre {centre.code}: {centre.name}")

            for day in range(1, 7):
                on_date = date.today() + timedelta(days=day)
                for start, end in SLOT_TIMES:
                    exists = (
                        await db.execute(
                            select(Slot).where(
                                Slot.centre_id == centre.id,
                                Slot.date == on_date,
                                Slot.start_time == start,
                            )
                        )
                    ).scalar_one_or_none()
                    if not exists:
                        await slot_service.create(
                            db,
                            SlotCreate(
                                centre_id=centre.id,
                                date=on_date,
                                start_time=start,
                                end_time=end,
                                max_bookings=10,
                            ),
                        )
                        await db.flush()
            # Mark centre active explicitly (create already sets is_active=True).
            await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
