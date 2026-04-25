from __future__ import annotations

from typing import Any

import httpx


def _num(v: Any) -> float:
  try:
    if v is None:
      return 0.0
    return float(v)
  except Exception:
    return 0.0


def normalize_off_product(p: dict) -> dict:
  name = (
    p.get("product_name")
    or p.get("generic_name")
    or p.get("abbreviated_product_name")
    or p.get("brands")
    or "Unknown product"
  )
  nutr = p.get("nutriments") or {}

  # OFF typically provides *_100g values; use those as a consistent baseline.
  calories = _num(nutr.get("energy-kcal_100g") or nutr.get("energy-kcal") or nutr.get("energy_100g"))
  protein = _num(nutr.get("proteins_100g") or nutr.get("proteins"))
  carbs = _num(nutr.get("carbohydrates_100g") or nutr.get("carbohydrates"))
  fat = _num(nutr.get("fat_100g") or nutr.get("fat"))
  fiber = _num(nutr.get("fiber_100g") or nutr.get("fiber"))

  code = str(p.get("code") or p.get("_id") or "")

  return {
    "id": code or name,
    "name": str(name),
    "macros": {
      "calories": round(calories, 1),
      "protein": round(protein, 1),
      "carbs": round(carbs, 1),
      "fat": round(fat, 1),
      "fiber": round(fiber, 1),
    },
    "source": "openfoodfacts",
  }


class OpenFoodFactsClient:
  def __init__(self) -> None:
    self._base = "https://world.openfoodfacts.org"

  async def search(self, query: str, *, page: int = 1, page_size: int = 10) -> list[dict]:
    params = {
      "search_terms": query,
      "search_simple": 1,
      "action": "process",
      "json": 1,
      "page": page,
      "page_size": page_size,
    }

    async with httpx.AsyncClient(timeout=20) as client:
      r = await client.get(f"{self._base}/cgi/search.pl", params=params)
      r.raise_for_status()
      data = r.json()

    products = data.get("products") or []
    out: list[dict] = []
    for p in products:
      if not isinstance(p, dict):
        continue
      out.append(normalize_off_product(p))
    return out

  async def by_barcode(self, barcode: str) -> dict | None:
    async with httpx.AsyncClient(timeout=20) as client:
      r = await client.get(f"{self._base}/api/v2/product/{barcode}.json")
      if r.status_code == 404:
        return None
      r.raise_for_status()
      data = r.json()
    product = data.get("product")
    if not isinstance(product, dict):
      return None
    product = {**product, "code": barcode}
    return normalize_off_product(product)

