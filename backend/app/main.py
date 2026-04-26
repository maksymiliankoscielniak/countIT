from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, days, me, products


def _split_origins(raw: str) -> list[str]:
  parts = [p.strip() for p in raw.split(",")]
  return [p for p in parts if p]


app = FastAPI(title="countIT API")

app.add_middleware(
  CORSMiddleware,
  allow_origins=_split_origins(settings.cors_origins),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/health")
def health():
  return {"ok": True}


app.include_router(auth.router)
app.include_router(products.router)
app.include_router(me.router)
app.include_router(days.router)

