from fastapi import APIRouter

router = APIRouter(prefix="/products", tags=["products"])


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
      from fastapi import HTTPException
      raise HTTPException(status_code=502, detail="External API failed or timed out. Please try again later.")


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

