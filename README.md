# countIT
Full-stack calorie tracking app. Built with React, TypeScript & FastAPI.

## Environment variables

### Frontend (GitHub Pages / Vite)

- `VITE_API_BASE_URL`: base URL of the deployed backend, e.g. `https://your-service.onrender.com`

In GitHub Actions this is read from the repository variable `VITE_API_BASE_URL` (see `[.github/workflows/deploy.yml](.github/workflows/deploy.yml)`).

### Backend (Render / FastAPI)

- `DATABASE_URL`
- `SECRET_KEY`
- `CORS_ORIGINS`: comma-separated, e.g. `https://<your-user>.github.io,http://localhost:5173`
- `COOKIE_SECURE`: `true` on Render, `false` for local dev
- `COOKIE_SAMESITE`: `none` for GitHub Pages -> Render cross-site cookies
