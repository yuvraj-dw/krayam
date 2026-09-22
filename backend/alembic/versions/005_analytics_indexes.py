"""analytics indexes for bookings and procurements

Revision ID: 005
Revises: 004
Create Date: 2026-09-22
"""

from collections.abc import Sequence

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Indexes to accelerate analytics joins and aggregations
    op.create_index(
        "idx_bookings_centre_created",
        "bookings",
        ["centre_id", "created_at"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_procurements_booking_created",
        "procurements",
        ["booking_id", "created_at"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_queue_centre_status_proc_end",
        "queue_entries",
        ["centre_id", "status", "processing_end"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("idx_queue_centre_status_proc_end", table_name="queue_entries", if_exists=True)
    op.drop_index("idx_procurements_booking_created", table_name="procurements", if_exists=True)
    op.drop_index("idx_bookings_centre_created", table_name="bookings", if_exists=True)
