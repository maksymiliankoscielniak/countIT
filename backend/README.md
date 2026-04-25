 ## countIT backend
 
 FastAPI + Postgres backend for countIT (auth + products).
 
 ### Local dev (quick)
 
 - Create a `.env` in `backend/` (example):
 
 ```bash
 DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/countit
 SECRET_KEY=dev-secret-change-me
 CORS_ORIGINS=http://localhost:5173
 COOKIE_SECURE=false
 COOKIE_SAMESITE=lax
COOKIE_DOMAIN=
 ```
 
 - Install deps (uv):
 
 ```bash
 uv pip install -r <(uv pip compile pyproject.toml)
 ```
 
 - Run:
 
 ```bash
 uvicorn app.main:app --reload --port 8000
 ```

### Migrations (Alembic)

Run (from `backend/`):

```bash
alembic upgrade head
```

### GitHub Pages + Render notes (cookies)

For GitHub Pages (frontend) calling Render (backend) cross-site, you need:

- **Backend env**:
  - `CORS_ORIGINS=https://<your-user>.github.io,http://localhost:5173`
  - `COOKIE_SECURE=true`
  - `COOKIE_SAMESITE=none`
- **Frontend**:
  - Build-time `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`
  - All requests use `credentials: 'include'` (already implemented in `frontend/src/lib/api.ts`)

 
