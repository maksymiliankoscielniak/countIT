from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserDay(Base):
  __tablename__ = "user_days"

  id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
  date: Mapped[str] = mapped_column(String(10), index=True, nullable=False) # Format: YYYY-MM-DD
  data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default='{}')

  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
    nullable=False,
  )

  __table_args__ = (
    UniqueConstraint("user_id", "date", name="uq_user_id_date"),
  )
