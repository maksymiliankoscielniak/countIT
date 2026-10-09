<div align="center">
  <img src="frontend/public/countIT.svg" width="300" alt="countIT Logo"/>
  <h1>countIT</h1>
  <p><strong>A modern, full-stack macro & calorie tracking application.</strong></p>
</div>

---

**countIT** is a beautifully designed, highly responsive calorie tracking app that allows users to seamlessly log their meals, track their macros, and calculate their daily needs based on scientific body metric formulas.

## Features

- **USDA FoodData Central Integration**: Search for thousands of real products with hyper-accurate, government-verified macros. Falls back to Open Food Facts, then to a small built-in product list, when USDA is unavailable or rate-limited.
- **Dynamic Portion Sizing**: Say goodbye to default 100g portions. Input your exact weight (e.g., `150g`) and watch the macros auto-scale.
- **Body Metrics Calculator**: Built-in Mifflin-St Jeor equation to automatically generate optimized daily macro goals based on your age, weight, height, sex, and activity level.
- **Fully Responsive UI**: A gorgeous, glassmorphism-inspired dark mode interface that works perfectly on desktop and mobile.
- **Secure Authentication**: Full user login and registration system using FastAPI, PostgreSQL, and secure `HttpOnly` JWT cross-origin cookies.
- **Drag-and-Drop Meals**: Intuitively reorder your meals using native drag-and-drop or mobile-friendly pointer drag handles.

---

## Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** for lightning-fast bundling
- **Vanilla CSS** (No heavy UI frameworks, pure custom styling)
- Hosted on **GitHub Pages**

### Backend
- **FastAPI** (Python 3.11+)
- **SQLAlchemy** (PostgreSQL, hosted on Neon)
- **Bcrypt** & **JWT** for authentication
- Hosted on **Render** (deployed via Docker). Database migrations run automatically on container startup. If the database is unreachable the API still starts, so product search keeps working, but login and saved data do not

---

## Environment Variables

If you are forking or hosting this project yourself, you will need to configure the following environment variables.

### Frontend (GitHub Pages / Vite)
Create a `.env` file in the `frontend` directory:
```env
# Base URL of the deployed backend, e.g. https://your-service.onrender.com
VITE_API_BASE_URL=http://localhost:8000
```
*Note: In GitHub Actions, this is read from the repository variable `VITE_API_BASE_URL` (see `.github/workflows/deploy.yml`).*

### Backend (Render / FastAPI)
Create a `.env` file in the `backend` directory:
```env
# Your PostgreSQL Database URL (postgres:// and postgresql:// URLs are accepted)
DATABASE_URL=postgresql://user:password@localhost:5432/countit

# Secret string used to sign JWT tokens
SECRET_KEY=your_super_secret_string

# Comma-separated list of allowed frontend origins
CORS_ORIGINS=http://localhost:5173,https://your-username.github.io

# Security flags for cookies
COOKIE_SECURE=false      # Set to 'true' in production (Render)
COOKIE_SAMESITE=lax      # Set to 'none' for GitHub Pages -> Render cross-site cookies
```

---

## Local Development

### 1. Start the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
alembic upgrade head      # creates the tables; needs a running PostgreSQL matching DATABASE_URL
uvicorn app.main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Hosting and backups

- Render free instances spin down after inactivity, so the first request after a pause can take about 50 seconds.
- The data lives in a free-tier PostgreSQL database. Free tiers can expire, change or be reset, so keep backups. From the `backend` directory, with `pg_dump` installed:

```bash
DATABASE_URL='postgresql://user:password@host/db?sslmode=require' ./scripts/backup_db.sh
```

  This writes a dated, compressed dump to `backend/backups/` (git-ignored, because it contains user data).
