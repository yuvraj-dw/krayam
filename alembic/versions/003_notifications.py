"""notifications

Revision ID: 003
Revises: 002
Create Date: 2026-09-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "farmer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("farmers.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False, server_default="sms"),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="sent"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_farmer_id", "notifications", ["farmer_id"])
    op.create_index("ix_notifications_phone", "notifications", ["phone"])
    op.create_index("ix_notifications_event_type", "notifications", ["event_type"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_event_type", table_name="notifications")
    op.drop_index("ix_notifications_phone", table_name="notifications")
    op.drop_index("ix_notifications_farmer_id", table_name="notifications")
    op.drop_table("notifications")
