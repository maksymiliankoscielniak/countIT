from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.user_day import UserDay
from app.security.tokens import decode_access_token

router = APIRouter(prefix="/days", tags=["days"])


def _get_access_cookie(request: Request) -> str | None:
  return request.cookies.get(settings.cookie_access_name)


def _get_current_user_id(request: Request) -> str:
  token = _get_access_cookie(request)
  if not token:
    raise HTTPException(status_code=401, detail="Not authenticated")

  try:
    payload = decode_access_token(token)
  except JWTError:
    raise HTTPException(status_code=401, detail="Invalid token")

  user_id = payload.get("sub")
  if not user_id:
    raise HTTPException(status_code=401, detail="Invalid token")
    
  return user_id


@router.get("/{date_key}")
def get_day(date_key: str, request: Request, db: Session = Depends(get_db)):
  user_id = _get_current_user_id(request)

  user_day = db.execute(
    select(UserDay).where(UserDay.user_id == user_id, UserDay.date == date_key)
  ).scalar_one_or_none()

  if not user_day:
    return {"meals": []}

  return user_day.data


@router.put("/{date_key}")
def update_day(date_key: str, payload: dict, request: Request, db: Session = Depends(get_db)):
  user_id = _get_current_user_id(request)

  user_day = db.execute(
    select(UserDay).where(UserDay.user_id == user_id, UserDay.date == date_key)
  ).scalar_one_or_none()

  if user_day:
    user_day.data = payload
  else:
    user_day = UserDay(user_id=user_id, date=date_key, data=payload)
    db.add(user_day)

  db.commit()
  db.refresh(user_day)

  return user_day.data
