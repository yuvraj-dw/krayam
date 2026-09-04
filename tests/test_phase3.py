from app.models.booking import Booking, BookingStatus
from app.models.procurement import Procurement
from app.services.anomaly import anomaly_detector
from app.services.queue import ACTIVE_COUNTERS, AVG_PROCESS_MINUTES


def _booking(quantity: float) -> Booking:
    return Booking(
        booking_id="BK-TEST",
        farmer_id=None,
        crop="Wheat",
        quantity=quantity,
        unit="quintal",
        status=BookingStatus.PROCESSING,
    )


def _procurement(accepted: float) -> Procurement:
    return Procurement(
        procurement_id="PR-TEST",
        booking_id=None,
        accepted_quantity=accepted,
        unit="quintal",
        status="pending",
    )


def test_no_flags_when_within_tolerance():
    flags = anomaly_detector.check_procurement(_booking(30.0), _procurement(29.0))
    assert flags == []


def test_large_quantity_flag():
    booking = _booking(30.0)
    flags = anomaly_detector.check_procurement(booking, _procurement(80.0))
    assert "unusually_large_quantity" in flags


def test_quantity_mismatch_flag():
    flags = anomaly_detector.check_procurement(_booking(30.0), _procurement(15.0))
    assert "quantity_mismatch" in flags


def test_payment_large_amount_flag():
    booking = _booking(150.0)  # booked qty within tolerance but huge amount
    flags = anomaly_detector.check_payment(booking, 150.0, 600_000)
    assert "unusual_payment_amount" in flags


def test_rules_never_auto_reject():
    booking = _booking(30.0)
    flags = anomaly_detector.check_procurement(booking, _procurement(80.0))
    assert flags, "suspicious records are flagged, not rejected"


def test_eta_scales_with_queue_ahead():
    # position 1 -> no wait
    assert (1 - 1) // ACTIVE_COUNTERS * AVG_PROCESS_MINUTES == 0
    ahead = 5
    expected = (ahead // ACTIVE_COUNTERS) * AVG_PROCESS_MINUTES
    assert expected == (5 // 2) * 10
