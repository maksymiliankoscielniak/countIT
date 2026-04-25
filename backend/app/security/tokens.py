from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(*, user_id: str) -> str:
  now = datetime.now(UTC)
  exp = now + timedelta(seconds=settings.access_token_ttl_seconds)
  payload = {"sub": user_id, "exp": exp}
  return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
  return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def make_refresh_token() -> str:
  return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
  return hashlib.sha256(token.encode("utf-8")).hexdigest()


def is_jwt_error(err: Exception) -> bool:
  return isinstance(err, JWTError)

