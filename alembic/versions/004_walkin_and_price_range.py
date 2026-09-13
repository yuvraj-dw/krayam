"""walkin and price range and procurement quality

Revision ID: 004
Revises: 003
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. bookings.is_walk_in (Boolean, default False, not null)
    op.add_column(
        "bookings",
        sa.Column("is_walk_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # 2 & 3. centre_crops.min_price_per_unit, centre_crops.max_price_per_unit (Numeric(10, 2), nullable)
    op.add_column(
        "centre_crops",
        sa.Column("min_price_per_unit", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "centre_crops",
        sa.Column("max_price_per_unit", sa.Numeric(10, 2), nullable=True),
    )

    # 4 & 5. procurements.unit_price (Numeric(10, 2), not null, default 0.0), quality_grade (String(50), nullable)
    op.add_column(
        "procurements",
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False, server_default=sa.text("0.0")),
    )
    op.add_column(
        "procurements",
        sa.Column("quality_grade", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("procurements", "quality_grade")
    op.drop_column("procurements", "unit_price")
    op.drop_column("centre_crops", "max_price_per_unit")
    op.drop_column("centre_crops", "min_price_per_unit")
    op.drop_column("bookings", "is_walk_in")
