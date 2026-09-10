import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError, ValidationError
from app.models.centre import CentreCrop
from app.models.payment import Payment, PaymentStatus
from app.models.procurement import Procurement
from app.services.anomaly import anomaly_detector
from app.services.booking import booking_service
from app.services.event import event_service
from app.services.outbox import outbox_service


def generate_payment_id() -> str:
    return f"PAY-{uuid.uuid4().hex[:5].upper()}"


class PaymentService:
    async def create_for_procurement(
        self, db: AsyncSession, procurement: Procurement, client_event_id: uuid.UUID | None = None
    ) -> Payment:
        """Backend-computed payment. Never trusts a frontend amount."""
        booking = await booking_service.get_by_id(db, procurement.booking_id)

        rate = await self._applicable_rate(db, booking)
        accepted = float(procurement.accepted_quantity)
        amount = round(accepted * rate, 2)

        flags = anomaly_detector.check_payment(booking, accepted, amount)

        payment = Payment(
            payment_id=generate_payment_id(),
            procurement_id=procurement.id,
            farmer_id=booking.farmer_id,
            quantity=accepted,
            rate=rate,
            amount=amount,
            status=PaymentStatus.INITIATED,
        )
        db.add(payment)
        await db.flush()
        await db.refresh(payment)

        await event_service.record(
            db,
            event_type="payment_initiated",
            entity_type="booking",
            entity_id=booking.id,
            data={
                "payment_id": payment.payment_id,
                "amount": amount,
                "anomaly_flags": flags,
            },
        )
        await outbox_service.emit(
            db,
            event_type="payment.initiated",
            entity_type="booking",
            entity_id=booking.id,
            data={
                "payment_id": payment.payment_id,
                "amount": amount,
                "anomaly_flags": flags,
            },
            centre_id=booking.centre_id,
            farmer_id=booking.farmer_id,
            actor_type="operator",
            client_event_id=client_event_id,
        )
        await db.commit()
        return payment

    async def _applicable_rate(self, db: AsyncSession, booking) -> float:
        if booking.centre_id:
            result = await db.execute(
                select(CentreCrop).where(
                    CentreCrop.centre_id == booking.centre_id,
                    CentreCrop.crop_name == booking.crop,
                    CentreCrop.is_active.is_(True),
                )
            )
            crop = result.scalar_one_or_none()
            if crop and crop.rate_per_unit is not None:
                return float(crop.rate_per_unit)
        # ponytail: fallback default rate; reserve per-centre rate lookup for phase 11+
        return 2500.0

    async def get_by_id(self, db: AsyncSession, payment_id: uuid.UUID) -> Payment:
        result = await db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()
        if not payment:
            raise NotFoundError("Payment not found")
        return payment

    async def mark_pending_verification(
        self, db: AsyncSession, payment_id: uuid.UUID
    ) -> Payment:
        payment = await self.get_by_id(db, payment_id)
        if payment.status != PaymentStatus.INITIATED:
            raise ValidationError("Only initiated payments can be sent for verification")
        payment.status = PaymentStatus.PENDING_VERIFICATION
        await db.flush()
        await db.refresh(payment)
        await event_service.record(
            db,
            event_type="payment_pending_verification",
            entity_type="booking",
            entity_id=payment.procurement_id,
            data={"payment_id": payment.payment_id},
        )
        await db.commit()
        return payment

    async def review(
        self,
        db: AsyncSession,
        payment_id: uuid.UUID,
        *,
        confirmed: bool,
        verified_by: str | None = None,
        client_event_id: uuid.UUID | None = None,
    ) -> Payment:
        """Human operator confirms or rejects. AI never auto-confirms."""
        payment = await self.get_by_id(db, payment_id)
        if payment.status not in (
            PaymentStatus.INITIATED,
            PaymentStatus.PENDING_VERIFICATION,
        ):
            raise ValidationError("Payment not in a reviewable state")

        now = datetime.now(timezone.utc)
        payment.verified_by = verified_by
        payment.verified_at = now
        if confirmed:
            payment.status = PaymentStatus.CONFIRMED
            payment.confirmed_at = now
        else:
            payment.status = PaymentStatus.CANCELLED

        await db.flush()
        await db.refresh(payment)
        await event_service.record(
            db,
            event_type="payment_confirmed" if confirmed else "payment_cancelled",
            entity_type="booking",
            entity_id=payment.procurement_id,
            data={"payment_id": payment.payment_id, "verified_by": verified_by},
        )
        procurement = (
            await db.execute(select(Procurement).where(Procurement.id == payment.procurement_id))
        ).scalar_one_or_none()
        booking = (
            await booking_service.get_by_id(db, procurement.booking_id)
            if procurement
            else None
        )
        if booking is not None:
            await outbox_service.emit(
                db,
                event_type="payment.confirmed" if confirmed else "payment.verified",
                entity_type="booking",
                entity_id=booking.id,
                data={
                    "payment_id": payment.payment_id,
                    "confirmed": confirmed,
                    "verified_by": verified_by,
                },
                centre_id=booking.centre_id,
                farmer_id=booking.farmer_id,
                actor_type="operator",
                client_event_id=client_event_id,
            )
        await db.commit()
        return payment

    async def review_payload_for(
        self, db: AsyncSession, procurement: Procurement
    ) -> dict:
        """Assemble the operator review screen payload."""
        payment = (
            await db.execute(
                select(Payment).where(Payment.procurement_id == procurement.id)
            )
        ).scalar_one_or_none()
        booking = await booking_service.get_by_id(db, procurement.booking_id)
        flags = anomaly_detector.check_procurement(booking, procurement)
        if payment:
            flags = list(dict.fromkeys(flags + anomaly_detector.check_payment(
                booking, float(payment.quantity), float(payment.amount))))
        return {
            "procurement_id": procurement.procurement_id,
            "booking_id": str(procurement.booking_id),
            "crop": booking.crop,
            "booked_quantity": float(booking.quantity),
            "accepted_quantity": float(procurement.accepted_quantity),
            "rate": float(payment.rate) if payment else None,
            "amount": float(payment.amount) if payment else None,
            "status": payment.status.value if payment else None,
            "anomaly_flags": flags,
        }


payment_service = PaymentService()
