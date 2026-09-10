from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import BookingStatus
from app.models.queue import QueueEntry, QueueStatus
from app.models.slot import Slot
from app.schemas.procurement import RecommendedCentre
from app.services.centre import centre_service, haversine_km
from app.services.forecast import forecast_service


def _booking_weight(status: BookingStatus) -> int:
    """Load weight per booking status. Higher = more load on the centre."""
    if status in (BookingStatus.CHECKED_IN, BookingStatus.PROCESSING):
        return 2
    if status in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        return 1
    return 0


class RecommendationService:
    """Ranks centres for a farmer's booking.

    ponytail: naive weighted scoring — distance, crop acceptance, queue load,
    slot availability, expected-load forecast. Ceiling: ignores waiting-time
    ETA prediction and demand forecasting beyond the expected-load term.
    """

    async def recommend(
        self,
        db: AsyncSession,
        *,
        crop: str,
        expected_date: date,
        farmer_lat: float,
        farmer_lng: float,
        pincode: str | None = None,
    ) -> list[RecommendedCentre]:
        centres = await centre_service.list(db, crop=crop, active_only=True)
        if not centres:
            return []

        # Load per centre: active queue positions + pending/confirmed bookings load.
        queue_counts = dict(
            (
                await db.execute(
                    select(QueueEntry.centre_id, func.count(QueueEntry.id))
                    .where(QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.CALLED]))
                    .group_by(QueueEntry.centre_id)
                )
            ).all()
        )
        expected_loads = await forecast_service.expected_loads(
            db,
            centre_ids=[centre.id for centre in centres],
            target_date=expected_date,
        )
        results: list[RecommendedCentre] = []
        for centre in centres:
            distance = haversine_km(farmer_lat, farmer_lng, centre.latitude, centre.longitude)
            queue = queue_counts.get(centre.id, 0)
            has_slots = await self._has_available_slot(db, centre.id, expected_date)
            load = min(100.0, (queue / max(1, centre.capacity)) * 100)

            score = 0.0
            reasons: list[str] = [f"Accepts {crop}"]
            score += 5.0
            if distance <= 20:
                score += 3.0
                reasons.append(f"Nearby ({distance:.1f} km)")
            elif distance <= 50:
                score += 1.5
                reasons.append(f"{distance:.1f} km away")
            if queue == 0:
                score += 2.0
                reasons.append("No current queue")
            elif queue <= 5:
                score += 1.0
                reasons.append(f"Short queue ({queue} waiting)")
            else:
                reasons.append(f"Queue of {queue} waiting")
            if has_slots:
                score += 2.0
                reasons.append("Slots available on your date")
            else:
                reasons.append("No slots on your date")
            expected_pct = expected_loads.get(centre.id, 0.0)
            if expected_pct < 50:
                score += 2.0
                reasons.append(f"Low expected load on {expected_date}")
            elif expected_pct < 80:
                score += 1.0
                reasons.append(f"Moderate expected load on {expected_date}")
            else:
                score -= 1.5
                reasons.append(f"High expected load on {expected_date}")

            results.append(
                RecommendedCentre(
                    centre=centre,
                    distance_km=round(distance, 2),
                    accepted=True,
                    current_queue=queue,
                    est_wait_units=queue,
                    load_percent=round(load, 1),
                    has_slots=has_slots,
                    score=round(score, 2),
                    reasons=reasons,
                )
            )

        results.sort(key=lambda r: (-r.score, r.distance_km or 1e9))
        return results

    async def _has_available_slot(self, db: AsyncSession, centre_id, expected_date: date) -> bool:
        result = await db.execute(
            select(Slot.id).where(
                Slot.centre_id == centre_id,
                Slot.date == expected_date,
                Slot.is_available.is_(True),
            )
        )
        return result.first() is not None


recommendation_service = RecommendationService()
