import hashlib
import hmac
import os
import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import coalesce

from app.exceptions import AuthenticationError, ConflictError, ValidationError
from app.models.booking import Booking
from app.models.operator import Operator
from app.models.payment import Payment, PaymentStatus
from app.models.procurement import Procurement
from app.models.queue import QueueEntry, QueueStatus
from app.services.auth import auth_service
from app.services.centre import centre_service
from app.services.outbox import outbox_service
from app.services.queue import queue_service
from app.utils.phone import normalize_phone, validate_phone

PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (ValueError, TypeError):
        return False
    computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
    return hmac.compare_digest(computed, expected)


class OperatorService:
    async def register(
        self,
        db: AsyncSession,
        *,
        name: str,
        phone: str,
        password: str,
        centre_id: uuid.UUID,
    ) -> Operator:
        if not validate_phone(phone):
            raise ValidationError("Invalid phone number. Enter a 10-digit Indian mobile number.")
        normalized = normalize_phone(phone)
        await centre_service.get_by_id(db, centre_id)
        existing = await db.execute(select(Operator).where(Operator.phone == normalized))
        if existing.scalar_one_or_none():
            raise ConflictError("An operator with this phone already exists")
        operator = Operator(
            name=name.strip(),
            phone=normalized,
            password_hash=hash_password(password),
            centre_id=centre_id,
        )
        db.add(operator)
        await db.flush()
        await db.refresh(operator)
        return operator

    async def login(
        self, db: AsyncSession, *, phone: str, password: str
    ) -> Operator:
        normalized = normalize_phone(phone)
        result = await db.execute(select(Operator).where(Operator.phone == normalized))
        operator = result.scalar_one_or_none()
        if not operator or not verify_password(password, operator.password_hash):
            raise AuthenticationError("Invalid phone or password")
        if not operator.is_active:
            raise AuthenticationError("Operator account is inactive")
        return operator

    def token_for(self, operator: Operator) -> str:
        return auth_service.create_access_token(
            str(operator.id),
            role="operator",
            claims={"centre_id": str(operator.centre_id)},
        )

    async def get_dashboard_summary(
        self, db: AsyncSession, centre_id: uuid.UUID
    ) -> dict:
        today = date.today()
        # Today's total scheduled bookings
        total_bookings = int(
            (
                await db.scalar(
                    select(func.count(Booking.id)).where(
                        Booking.centre_id == centre_id,
                        Booking.expected_date == today,
                    )
                )
            )
            or 0
        )

        # Live queue entries
        waiting_count = int(
            (
                await db.scalar(
                    select(func.count(QueueEntry.id)).where(
                        QueueEntry.centre_id == centre_id,
                        QueueEntry.status == QueueStatus.WAITING,
                    )
                )
            )
            or 0
        )
        called_count = int(
            (
                await db.scalar(
                    select(func.count(QueueEntry.id)).where(
                        QueueEntry.centre_id == centre_id,
                        QueueEntry.status == QueueStatus.CALLED,
                    )
                )
            )
            or 0
        )
        processing_count = int(
            (
                await db.scalar(
                    select(func.count(QueueEntry.id)).where(
                        QueueEntry.centre_id == centre_id,
                        QueueEntry.status == QueueStatus.PROCESSING,
                    )
                )
            )
            or 0
        )
        estimated_wait = await queue_service.estimate_wait(db, centre_id)

        # Today's procurements
        dt_start = datetime.combine(today, time.min, tzinfo=timezone.utc)
        dt_end = datetime.combine(today, time.max, tzinfo=timezone.utc)
        proc_row = (
            await db.execute(
                select(
                    func.count(Procurement.id),
                    coalesce(func.sum(Procurement.accepted_quantity), 0.0),
                )
                .join(Booking, Procurement.booking_id == Booking.id)
                .where(
                    Booking.centre_id == centre_id,
                    Procurement.created_at.between(dt_start, dt_end),
                )
            )
        ).first()
        completed_today_count = int(proc_row[0] or 0) if proc_row else 0
        total_tonnage_today = float(proc_row[1] or 0.0) if proc_row else 0.0

        # Pending payments
        pmt_row = (
            await db.execute(
                select(
                    func.count(Payment.id),
                    coalesce(func.sum(Payment.amount), 0.0),
                )
                .join(Procurement, Payment.procurement_id == Procurement.id)
                .join(Booking, Procurement.booking_id == Booking.id)
                .where(
                    Booking.centre_id == centre_id,
                    Payment.status.in_(
                        [PaymentStatus.INITIATED, PaymentStatus.PENDING_VERIFICATION]
                    ),
                )
            )
        ).first()
        pending_payments_count = int(pmt_row[0] or 0) if pmt_row else 0
        pending_payments_amount = float(pmt_row[1] or 0.0) if pmt_row else 0.0

        # Centre capacity utilization
        centre = await centre_service.get_by_id(db, centre_id)
        daily_capacity = centre.capacity or 50
        utilization_percent = (
            round((total_bookings / daily_capacity) * 100.0, 1)
            if daily_capacity > 0
            else 0.0
        )

        max_outbox_id = await outbox_service.max_id(db)

        return {
            "centre_id": centre_id,
            "today": today,
            "bookings_today_total": total_bookings,
            "queue": {
                "waiting_count": waiting_count,
                "called_count": called_count,
                "processing_count": processing_count,
                "estimated_wait_minutes": estimated_wait,
            },
            "procurement": {
                "completed_today_count": completed_today_count,
                "total_tonnage_today": total_tonnage_today,
            },
            "payments": {
                "pending_count": pending_payments_count,
                "pending_amount": pending_payments_amount,
                "flagged_count": 0,
            },
            "capacity": {
                "daily_capacity": daily_capacity,
                "utilization_percent": utilization_percent,
            },
            "sync": {
                "max_outbox_id": max_outbox_id,
            },
        }


operator_service = OperatorService()
