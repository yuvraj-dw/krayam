from app.models.booking import Booking
from app.models.procurement import Procurement

# ponytail: prototype thresholds. Rule-based only — AI may flag, never auto-reject.
MAX_QUANTITY_QUINTALS = 50
MAX_ACCEPTED_MISMATCH_PCT = 0.20
MAX_PAYMENT_AMOUNT = 500_000


class AnomalyDetector:
    def check_procurement(
        self, booking: Booking, procurement: Procurement
    ) -> list[str]:
        flags: list[str] = []
        if float(procurement.accepted_quantity) > MAX_QUANTITY_QUINTALS:
            flags.append("unusually_large_quantity")
        booked = float(booking.quantity)
        accepted = float(procurement.accepted_quantity)
        if booked > 0:
            diff_pct = abs(accepted - booked) / booked
            if diff_pct > MAX_ACCEPTED_MISMATCH_PCT:
                flags.append("quantity_mismatch")
        return flags

    def check_payment(
        self, booking: Booking, accepted_quantity: float, amount: float
    ) -> list[str]:
        flags: list[str] = []
        if amount > MAX_PAYMENT_AMOUNT:
            flags.append("unusual_payment_amount")
        booked = float(booking.quantity)
        if booked > 0 and abs(accepted_quantity - booked) / booked > MAX_ACCEPTED_MISMATCH_PCT:
            flags.append("quantity_mismatch")
        return flags


anomaly_detector = AnomalyDetector()
