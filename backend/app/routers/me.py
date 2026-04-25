from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserOut
from app.security.tokens import decode_access_token

router = APIRouter(tags=["me"])


def _get_access_cookie(request: Request) -> str | None:
  return request.cookies.get(settings.cookie_access_name)


@router.get("/me", response_model=UserOut)
def me(request: Request, db: Session = Depends(get_db)):
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

  user = db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=401, detail="User not found")

  return UserOut(id=str(user.id), email=user.email, displayName=user.display_name)

