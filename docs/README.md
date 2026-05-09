# TerraGuard: Crop Failure Early Warning System

## Overview
TerraGuard is an AI-powered Crop Failure Early Warning System designed for small farms in developing nations. By combining satellite data, weather metrics, and IBM watsonx.ai, TerraGuard predicts agricultural vulnerability and generates actionable insights to prevent crop failure.

## Hackathon Goals
- **UN SDG Alignment:** Goal 2 (Zero Hunger) & Goal 13 (Climate Action).
- **IBM Integration:** watsonx.ai for generative insights, IBM/NASA geospatial model patterns.
- **Impact:** Provide accessible climate resilience tools for low-resource regions.

## Architecture
- **Frontend:** Next.js, Tailwind CSS, React Leaflet (Map-first dashboard).
- **Backend:** FastAPI (Python) for data aggregation and ML inference.
- **AI Pipeline:** Lightweight Risk Model (Scikit-Learn/PyTorch) + IBM watsonx.ai for natural language insights.
- **Data Sources:** Open-Meteo (Weather), Sentinel-2 (NDVI).

## Quick Start
1. **Frontend:** `cd frontend && npm install && npm run dev`
2. **Backend:** `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
3. Add IBM watsonx.ai credentials in `backend/.env`.

See `docs/` for detailed setup and deployment instructions.
