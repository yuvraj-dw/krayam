"""outbox events + operators

Revision ID: 002
Revises: 001
Create Date: 2026-09-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "operators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "centre_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("centres.id"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "outbox_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "centre_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("centres.id")
        ),
        sa.Column(
            "farmer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("farmers.id")
        ),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("data", postgresql.JSONB, default=dict),
        sa.Column("actor_type", sa.String(20)),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("client_event_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_outbox_centre", "outbox_events", ["centre_id", "id"])
    op.create_index("idx_outbox_farmer", "outbox_events", ["farmer_id", "id"])
    op.create_index("idx_outbox_event_type", "outbox_events", ["event_type", "id"])
    op.create_index(
        "uq_outbox_client_event_id",
        "outbox_events",
        ["client_event_id"],
        unique=True,
        postgresql_where=sa.text("client_event_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_outbox_client_event_id", table_name="outbox_events")
    op.drop_index("idx_outbox_event_type", table_name="outbox_events")
    op.drop_index("idx_outbox_farmer", table_name="outbox_events")
    op.drop_index("idx_outbox_centre", table_name="outbox_events")
    op.drop_table("outbox_events")
    op.drop_table("operators")
