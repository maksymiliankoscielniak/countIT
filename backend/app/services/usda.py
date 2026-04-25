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

def normalize_usda_product(p: dict) -> dict:
  name = p.get("description", "Unknown product")
  brand = p.get("brandOwner")
  if brand and brand.lower() not in name.lower():
    name = f"{brand} {name}"

  # Extract nutrients
  nutrients = p.get("foodNutrients") or []
  
  calories = 0.0
  protein = 0.0
  carbs = 0.0
  fat = 0.0
  fiber = 0.0

  for n in nutrients:
    n_name = n.get("nutrientName", "").lower()
    val = _num(n.get("value"))
    
    if "energy" in n_name and n.get("unitName", "").upper() == "KCAL":
      calories = val
    elif "protein" in n_name:
      protein = val
    elif "carbohydrate" in n_name:
      carbs = val
    elif "total lipid (fat)" in n_name or n_name == "fat":
      fat = val
    elif "fiber" in n_name:
      fiber = val

  code = str(p.get("fdcId", ""))

  return {
    "id": code or name,
    "name": str(name).title(),
    "macros": {
      "calories": round(calories, 1),
      "protein": round(protein, 1),
      "carbs": round(carbs, 1),
      "fat": round(fat, 1),
      "fiber": round(fiber, 1),
    },
    "source": "usda",
  }

class UsdaClient:
  def __init__(self) -> None:
    self._base = "https://api.nal.usda.gov/fdc/v1"
    self._api_key = "DEMO_KEY"

  async def search(self, query: str, *, page: int = 1, page_size: int = 10) -> list[dict]:
    params = {
      "api_key": self._api_key,
      "query": query,
      "pageNumber": page,
      "pageSize": page_size,
      "requireAllWords": "true"
    }

    async with httpx.AsyncClient(timeout=10) as client:
      r = await client.get(f"{self._base}/foods/search", params=params)
      r.raise_for_status()
      data = r.json()

    foods = data.get("foods") or []
    out: list[dict] = []
    for f in foods:
      if not isinstance(f, dict):
        continue
      out.append(normalize_usda_product(f))
    return out

  async def by_barcode(self, barcode: str) -> dict | None:
    # USDA doesn't natively support barcode search via fdcId, 
    # but some branded foods have GTIN/UPC. We can search by GTIN.
    params = {
      "api_key": self._api_key,
      "query": barcode,
      "pageSize": 1,
    }
    async with httpx.AsyncClient(timeout=10) as client:
      r = await client.get(f"{self._base}/foods/search", params=params)
      r.raise_for_status()
      data = r.json()
    
    foods = data.get("foods") or []
    if not foods:
      return None
    return normalize_usda_product(foods[0])
