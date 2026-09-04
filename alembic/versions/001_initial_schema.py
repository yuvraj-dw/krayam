"""Initial schema - all core tables

Revision ID: 001
Revises:
Create Date: 2026-09-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Enums
    booking_status = postgresql.ENUM(
        "pending",
        "confirmed",
        "checked_in",
        "processing",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
        "expired",
        name="bookingstatus",
        create_type=False,
    )
    booking_status.create(op.get_bind(), checkfirst=True)

    queue_status = postgresql.ENUM(
        "waiting",
        "called",
        "processing",
        "completed",
        "no_show",
        name="queuestatus",
        create_type=False,
    )
    queue_status.create(op.get_bind(), checkfirst=True)

    payment_status = postgresql.ENUM(
        "initiated",
        "pending_verification",
        "confirmed",
        "failed",
        "cancelled",
        name="paymentstatus",
        create_type=False,
    )
    payment_status.create(op.get_bind(), checkfirst=True)

    otp_purpose = postgresql.ENUM(
        "login",
        "register",
        name="otppurpose",
        create_type=False,
    )
    otp_purpose.create(op.get_bind(), checkfirst=True)

    # Farmers
    op.create_table(
        "farmers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(15), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("village", sa.String(255)),
        sa.Column("district", sa.String(255)),
        sa.Column("state", sa.String(255)),
        sa.Column("pincode", sa.String(10)),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("farmer_id", sa.String(50), unique=True),
        sa.Column("is_verified", sa.Boolean, default=False),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # OTPs
    op.create_table(
        "otps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(15), nullable=False, index=True),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("purpose", otp_purpose, nullable=False),
        sa.Column("attempts", sa.Integer, default=0),
        sa.Column("max_attempts", sa.Integer, default=3),
        sa.Column("is_used", sa.Boolean, default=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Centres
    op.create_table(
        "centres",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("address", sa.Text),
        sa.Column("village", sa.String(255)),
        sa.Column("district", sa.String(255)),
        sa.Column("state", sa.String(255)),
        sa.Column("latitude", sa.Numeric(10, 8), nullable=False),
        sa.Column("longitude", sa.Numeric(11, 8), nullable=False),
        sa.Column("capacity", sa.Integer, default=50),
        sa.Column("operating_start", sa.Time, server_default="09:00:00"),
        sa.Column("operating_end", sa.Time, server_default="17:00:00"),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Centre Crops
    op.create_table(
        "centre_crops",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("centre_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("centres.id")),
        sa.Column("crop_name", sa.String(100), nullable=False),
        sa.Column("rate_per_unit", sa.Numeric(10, 2)),
        sa.Column("unit", sa.String(20), default="quintal"),
        sa.Column("is_active", sa.Boolean, default=True),
    )

    # Slots
    op.create_table(
        "slots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("centre_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("centres.id")),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("max_bookings", sa.Integer, default=10),
        sa.Column("current_bookings", sa.Integer, default=0),
        sa.Column("is_available", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("centre_id", "date", "start_time"),
    )
    op.create_index("idx_slots_centre_date", "slots", ["centre_id", "date", "is_available"])

    # Bookings
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("booking_id", sa.String(50), unique=True, nullable=False),
        sa.Column("farmer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("farmers.id")),
        sa.Column("centre_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("centres.id")),
        sa.Column("slot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("slots.id")),
        sa.Column("crop", sa.String(100), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.String(20), default="quintal"),
        sa.Column("expected_date", sa.Date, nullable=False),
        sa.Column("status", booking_status, default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_bookings_farmer", "bookings", ["farmer_id", "status"])
    op.create_index("idx_bookings_centre", "bookings", ["centre_id", "status", "expected_date"])

    # Queue Entries
    op.create_table(
        "queue_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id")),
        sa.Column("centre_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("centres.id")),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("status", queue_status, default="waiting", nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True)),
        sa.Column("called_at", sa.DateTime(timezone=True)),
        sa.Column("processing_start", sa.DateTime(timezone=True)),
        sa.Column("processing_end", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_queue_centre", "queue_entries", ["centre_id", "status"])

    # Procurements
    op.create_table(
        "procurements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("procurement_id", sa.String(50), unique=True, nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id")),
        sa.Column("accepted_quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.String(20), default="quintal"),
        sa.Column("quality_notes", sa.Text),
        sa.Column("processing_start", sa.DateTime(timezone=True)),
        sa.Column("processing_end", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(20), default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Payments
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_id", sa.String(50), unique=True, nullable=False),
        sa.Column(
            "procurement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procurements.id"),
        ),
        sa.Column("farmer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("farmers.id")),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", payment_status, default="initiated", nullable=False),
        sa.Column("verified_by", sa.String(255)),
        sa.Column("verified_at", sa.DateTime(timezone=True)),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # SMS Sessions
    op.create_table(
        "sms_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(15), nullable=False, index=True),
        sa.Column("state", sa.String(50), default="idle"),
        sa.Column("context", postgresql.JSONB, default=dict),
        sa.Column("message_idempotency_key", sa.String(100)),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # SMS Messages
    op.create_table(
        "sms_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(15), nullable=False, index=True),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("message_id", sa.String(100)),
        sa.Column("status", sa.String(20)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Events (audit log)
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("actor_type", sa.String(20)),
        sa.Column("metadata", postgresql.JSONB, default=dict),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_events_entity", "events", ["entity_type", "entity_id"])
    op.create_index("idx_events_type", "events", ["event_type", "created_at"])


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("sms_messages")
    op.drop_table("sms_sessions")
    op.drop_table("payments")
    op.drop_table("procurements")
    op.drop_table("queue_entries")
    op.drop_table("bookings")
    op.drop_table("slots")
    op.drop_table("centre_crops")
    op.drop_table("centres")
    op.drop_table("otps")
    op.drop_table("farmers")

    postgresql.ENUM(name="paymentstatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="queuestatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="bookingstatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="otppurpose").drop(op.get_bind(), checkfirst=True)
