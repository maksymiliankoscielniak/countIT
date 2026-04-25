from __future__ import annotations

import bcrypt

def hash_password(password: str) -> str:
  pwd_bytes = password.encode('utf-8')
  salt = bcrypt.gensalt()
  hashed = bcrypt.hashpw(pwd_bytes, salt)
  return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
  pwd_bytes = password.encode('utf-8')
  hash_bytes = password_hash.encode('utf-8')
  try:
    return bcrypt.checkpw(pwd_bytes, hash_bytes)
  except ValueError:
    return False

