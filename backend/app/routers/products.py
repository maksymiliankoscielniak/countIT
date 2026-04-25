from fastapi import APIRouter

router = APIRouter(prefix="/products", tags=["products"])

MOCK_DB = [
    {"id": "mock_1", "name": "Chicken Breast (Raw)", "macros": {"calories": 110, "protein": 23.1, "carbs": 0, "fat": 1.2, "fiber": 0}, "source": "mock"},
    {"id": "mock_2", "name": "White Rice (Cooked)", "macros": {"calories": 130, "protein": 2.7, "carbs": 28.2, "fat": 0.3, "fiber": 0.4}, "source": "mock"},
    {"id": "mock_3", "name": "Broccoli (Raw)", "macros": {"calories": 34, "protein": 2.8, "carbs": 6.6, "fat": 0.4, "fiber": 2.6}, "source": "mock"},
    {"id": "mock_4", "name": "Large Egg", "macros": {"calories": 72, "protein": 6.3, "carbs": 0.4, "fat": 4.8, "fiber": 0}, "source": "mock"},
    {"id": "mock_5", "name": "Apple", "macros": {"calories": 52, "protein": 0.3, "carbs": 13.8, "fat": 0.2, "fiber": 2.4}, "source": "mock"},
    {"id": "mock_6", "name": "Oats", "macros": {"calories": 389, "protein": 16.9, "carbs": 66.3, "fat": 6.9, "fiber": 10.6}, "source": "mock"},
    {"id": "mock_7", "name": "Potato (Raw)", "macros": {"calories": 77, "protein": 2, "carbs": 17.5, "fat": 0.1, "fiber": 2.2}, "source": "mock"},
    {"id": "mock_8", "name": "Peanut Butter", "macros": {"calories": 588, "protein": 25.1, "carbs": 20, "fat": 50.4, "fiber": 6}, "source": "mock"},
    {"id": "mock_9", "name": "Pork Chop (Raw)", "macros": {"calories": 137, "protein": 20.6, "carbs": 0, "fat": 5.5, "fiber": 0}, "source": "mock"},
    {"id": "mock_10", "name": "Banana", "macros": {"calories": 89, "protein": 1.1, "carbs": 22.8, "fat": 0.3, "fiber": 2.6}, "source": "mock"}
]

def _search_mock_db(q: str):
    q_low = q.lower()
    return [item for item in MOCK_DB if q_low in item["name"].lower()]


@router.get("/health")
def products_health():
  return {"ok": True}


@router.get("/search")
async def search_products(query: str, page: int = 1, pageSize: int = 10):
  from app.services.usda import UsdaClient

  q = query.strip()
  if not q:
    return {"items": []}

  page = max(1, page)
  page_size = max(1, min(25, pageSize))
  try:
    items = await UsdaClient().search(q, page=page, page_size=page_size)
    return {"items": items}
  except Exception:
    try:
      from app.services.openfoodfacts import OpenFoodFactsClient
      items = await OpenFoodFactsClient().search(q, page=page, page_size=page_size)
      return {"items": items}
    except Exception:
      # If both APIs fail (USDA limit, OFF 503), return local mock data for portfolio stability
      return {"items": _search_mock_db(q)}


@router.get("/barcode/{barcode}")
async def product_by_barcode(barcode: str):
  from app.services.usda import UsdaClient

  code = barcode.strip()
  if not code:
    return {"item": None}

  try:
    item = await UsdaClient().by_barcode(code)
    if not item:
      raise Exception("Not found in USDA")
    return {"item": item}
  except Exception:
    try:
      from app.services.openfoodfacts import OpenFoodFactsClient
      item = await OpenFoodFactsClient().by_barcode(code)
      return {"item": item}
    except Exception:
      return {"item": None}

