# road-trip-planner

# Road Trip Planner

An interactive road trip planning application with route optimization, points of interest suggestions, weather forecasts, and collaborative trip sharing.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Google Maps API
- **Backend:** Python, Django, Django REST Framework, SQLite

## Features
- Route optimization
- Points of interest suggestions
- Weather forecasts
- Collaborative trip sharing

## Project Structure
```
roadTrip_planner/
│
├── backend/      # Django
└── frontend/     # React + TypeScript app
```

## Getting Started

### Backend
1. `cd backend`
2. `python3 -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt` (create this file with your dependencies)
4. Set up your PostgreSQL database and configure `config/settings.py`
5. `python manage.py migrate`
6. `python manage.py runserver`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

---

## Deployment
- Frontend: Vercel or Netlify
- Backend: Render, Railway, or similar (for Django/Postgres)
