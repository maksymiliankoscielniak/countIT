 """init users and refresh tokens
 
 Revision ID: 20260425_0001
 Revises: 
 Create Date: 2026-04-25
 
 """
 
 from __future__ import annotations
 
 import sqlalchemy as sa
 from alembic import op
 from sqlalchemy.dialects import postgresql
 
 revision = "20260425_0001"
 down_revision = None
 branch_labels = None
 depends_on = None
 
 
 def upgrade() -> None:
   op.create_table(
     "users",
     sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
     sa.Column("email", sa.String(length=320), nullable=False),
     sa.Column("password_hash", sa.String(length=255), nullable=False),
     sa.Column("display_name", sa.String(length=80), nullable=False),
     sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
     sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
   )
   op.create_index("ix_users_email", "users", ["email"], unique=True)
 
   op.create_table(
     "refresh_tokens",
     sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
     sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
     sa.Column("token_hash", sa.String(length=128), nullable=False),
     sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
     sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
     sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
     sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
   )
   op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
   op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)
   op.create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"], unique=False)
 
 
 def downgrade() -> None:
   op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
   op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
   op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
   op.drop_table("refresh_tokens")
 
   op.drop_index("ix_users_email", table_name="users")
   op.drop_table("users")
 
