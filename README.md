<div align="center">
  <img src="frontend/public/countIT.svg" width="300" alt="countIT Logo"/>
  <h1>countIT</h1>
  <p><strong>A modern, full-stack macro & calorie tracking application.</strong></p>
</div>

---

**countIT** is a beautifully designed, highly responsive calorie tracking app that allows users to seamlessly log their meals, track their macros, and calculate their daily needs based on scientific body metric formulas.

## ✨ Features

- 🍎 **USDA FoodData Central Integration**: Search for thousands of real products with hyper-accurate, government-verified macros.
- ⚖️ **Dynamic Portion Sizing**: Say goodbye to default 100g portions. Input your exact weight (e.g., `150g`) and watch the macros auto-scale.
- 🧮 **Body Metrics Calculator**: Built-in Mifflin-St Jeor equation to automatically generate optimized daily macro goals based on your age, weight, height, sex, and activity level.
- 📱 **Fully Responsive UI**: A gorgeous, glassmorphism-inspired dark mode interface that works perfectly on desktop and mobile.
- 🔒 **Secure Authentication**: Full user login and registration system using FastAPI, PostgreSQL, and secure `HttpOnly` JWT cross-origin cookies.
- 🖱️ **Drag-and-Drop Meals**: Intuitively reorder your meals using native drag-and-drop or mobile-friendly pointer drag handles.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** for lightning-fast bundling
- **Vanilla CSS** (No heavy UI frameworks, pure custom styling)
- Hosted on **GitHub Pages**

### Backend
- **FastAPI** (Python 3.10+)
- **SQLAlchemy** (PostgreSQL Database)
- **Bcrypt** & **JWT** for authentication
- Hosted on **Render**

---

## 🚀 Environment Variables

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
# Your PostgreSQL Database URL
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

## 💻 Local Development

### 1. Start the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.
