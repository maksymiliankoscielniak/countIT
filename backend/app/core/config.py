from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  # Database
  database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/countit"

  # Security
  secret_key: str = "dev-secret-change-me"
  access_token_ttl_seconds: int = 15 * 60
  refresh_token_ttl_seconds: int = 30 * 24 * 60 * 60

  # Cookies
  cookie_access_name: str = "countit_access"
  cookie_refresh_name: str = "countit_refresh"
  cookie_domain: str | None = None
  cookie_secure: bool = True
  cookie_samesite: str = "none"  # needed for GH Pages -> Render cross-site cookies

  # CORS
  cors_origins: str = "http://localhost:5173"

  # Auth (JWT)
  jwt_algorithm: str = "HS256"


settings = Settings()

