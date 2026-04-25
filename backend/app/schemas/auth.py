from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=8, max_length=200)
  displayName: str = Field(min_length=2, max_length=80)
  rememberMe: bool = False


class LoginRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=1, max_length=200)
  rememberMe: bool = False


class UserOut(BaseModel):
  id: str
  email: EmailStr
  displayName: str

