from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut
from app.security.passwords import hash_password, verify_password
from app.security.tokens import create_access_token, hash_refresh_token, make_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/health")
def auth_health():
  return {"ok": True}


def _set_access_cookie(response: Response, token: str) -> None:
  response.set_cookie(
    key=settings.cookie_access_name,
    value=token,
    httponly=True,
    secure=settings.cookie_secure,
    samesite=settings.cookie_samesite,
    domain=settings.cookie_domain,
    max_age=settings.access_token_ttl_seconds,
    path="/",
  )


def _set_refresh_cookie(response: Response, token: str, *, remember_me: bool) -> None:
  kwargs: dict = {}
  if remember_me:
    kwargs["max_age"] = settings.refresh_token_ttl_seconds
    kwargs["expires"] = int((datetime.now(UTC) + timedelta(seconds=settings.refresh_token_ttl_seconds)).timestamp())

  response.set_cookie(
    key=settings.cookie_refresh_name,
    value=token,
    httponly=True,
    secure=settings.cookie_secure,
    samesite=settings.cookie_samesite,
    domain=settings.cookie_domain,
    path="/",
    **kwargs,
  )


def _clear_auth_cookies(response: Response) -> None:
  response.delete_cookie(key=settings.cookie_access_name, domain=settings.cookie_domain, path="/")
  response.delete_cookie(key=settings.cookie_refresh_name, domain=settings.cookie_domain, path="/")


def _get_refresh_cookie(request: Request) -> str | None:
  return request.cookies.get(settings.cookie_refresh_name)


def _user_out(user: User) -> UserOut:
  return UserOut(id=str(user.id), email=user.email, displayName=user.display_name)


@router.post("/signup", response_model=UserOut)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
  try:
    email = body.email.strip().lower()

    exists = db.scalar(select(User).where(User.email == email))
    if exists:
      raise HTTPException(status_code=409, detail="Account already exists")

    user = User(email=email, password_hash=hash_password(body.password), display_name=body.displayName.strip())
    db.add(user)
    db.commit()
    db.refresh(user)

    access = create_access_token(user_id=str(user.id))
    refresh_raw = make_refresh_token()
    refresh_hash = hash_refresh_token(refresh_raw)
    refresh_row = RefreshToken(
      user_id=user.id,
      token_hash=refresh_hash,
      expires_at=datetime.now(UTC) + timedelta(seconds=settings.refresh_token_ttl_seconds),
      revoked_at=None,
    )
    db.add(refresh_row)
    db.commit()

    _set_access_cookie(response, access)
    _set_refresh_cookie(response, refresh_raw, remember_me=body.rememberMe)
    return _user_out(user)
  except HTTPException:
    raise
  except Exception as e:
    import traceback
    db.rollback()
    err_str = f"Internal Error: {str(e)}"
    raise HTTPException(status_code=500, detail=err_str)



@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
  try:
    email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(body.password, user.password_hash):
      raise HTTPException(status_code=401, detail="Wrong email or password")

    access = create_access_token(user_id=str(user.id))
    refresh_raw = make_refresh_token()
    refresh_hash = hash_refresh_token(refresh_raw)
    refresh_row = RefreshToken(
      user_id=user.id,
      token_hash=refresh_hash,
      expires_at=datetime.now(UTC) + timedelta(seconds=settings.refresh_token_ttl_seconds),
      revoked_at=None,
    )
    db.add(refresh_row)
    db.commit()

    _set_access_cookie(response, access)
    _set_refresh_cookie(response, refresh_raw, remember_me=body.rememberMe)
    return _user_out(user)
  except HTTPException:
    raise
  except Exception as e:
    db.rollback()
    err_str = f"Internal Error: {str(e)}"
    raise HTTPException(status_code=500, detail=err_str)



@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
  raw = _get_refresh_cookie(request)
  if not raw:
    raise HTTPException(status_code=401, detail="Missing refresh token")

  token_hash = hash_refresh_token(raw)
  row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
  if not row or row.revoked_at is not None:
    raise HTTPException(status_code=401, detail="Invalid refresh token")
  if row.expires_at < datetime.now(UTC):
    raise HTTPException(status_code=401, detail="Refresh token expired")

  user = db.get(User, row.user_id)
  if not user:
    raise HTTPException(status_code=401, detail="User not found")

  # rotate: revoke old, create new
  row.revoked_at = datetime.now(UTC)

  new_raw = make_refresh_token()
  new_hash = hash_refresh_token(new_raw)
  new_row = RefreshToken(
    user_id=user.id,
    token_hash=new_hash,
    expires_at=datetime.now(UTC) + timedelta(seconds=settings.refresh_token_ttl_seconds),
    revoked_at=None,
  )
  db.add(new_row)

  access = create_access_token(user_id=str(user.id))
  _set_access_cookie(response, access)
  # Keep refresh persistent by default; frontend can always re-login to drop persistence.
  _set_refresh_cookie(response, new_raw, remember_me=True)

  db.commit()
  return {"ok": True}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
  raw = _get_refresh_cookie(request)
  if raw:
    token_hash = hash_refresh_token(raw)
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if row and row.revoked_at is None:
      row.revoked_at = datetime.now(UTC)
      db.commit()

  _clear_auth_cookies(response)
  return {"ok": True}
 
