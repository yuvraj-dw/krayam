from app.models.booking import VALID_TRANSITIONS, BookingStatus
from app.services.centre import haversine_km


def test_haversine_known_distance():
    # Delhi -> Mumbai approximate great-circle distance ~1150 km
    dist = haversine_km(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1100 < dist < 1200


def test_haversine_zero_distance():
    assert haversine_km(20.0, 80.0, 20.0, 80.0) == 0.0


def test_pending_transitions_are_valid():
    allowed = VALID_TRANSITIONS[BookingStatus.PENDING]
    assert BookingStatus.CONFIRMED in allowed
    assert BookingStatus.CANCELLED in allowed
    assert BookingStatus.COMPLETED not in allowed
    assert BookingStatus.CHECKED_IN not in allowed


def test_cancelled_is_terminal_and_cannot_complete():
    assert VALID_TRANSITIONS[BookingStatus.CANCELLED] == set()
    assert BookingStatus.CANCELLED not in VALID_TRANSITIONS[BookingStatus.COMPLETED]
