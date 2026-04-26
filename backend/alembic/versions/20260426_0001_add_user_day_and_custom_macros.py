"""add user_day and custom_macros

Revision ID: 20260426_0001
Revises: 20260425_0001
Create Date: 2026-04-26

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260426_0001"
down_revision = "20260425_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add custom_macros to users
    op.add_column("users", sa.Column("custom_macros", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Create user_days table
    op.create_table(
        "user_days",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "date", name="uq_user_id_date"),
    )
    op.create_index("ix_user_days_user_id", "user_days", ["user_id"], unique=False)
    op.create_index("ix_user_days_date", "user_days", ["date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_days_date", table_name="user_days")
    op.drop_index("ix_user_days_user_id", table_name="user_days")
    op.drop_table("user_days")

    op.drop_column("users", "custom_macros")
