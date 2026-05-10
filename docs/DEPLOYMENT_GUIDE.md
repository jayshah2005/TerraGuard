# Deployment Guide

This guide matches the current GrowSpot codebase layout:

- Frontend: `frontend/` (Next.js)
- Backend: `backend/` (FastAPI)

## 1) Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.10+

### Environment Variables

Create a root `.env` file with at least:

```env
IBM_CLOUD_API_KEY=your_ibm_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
FRONTEND_URL=http://localhost:3000
```

Optional:

```env
USDA_NASS_API_KEY=optional_usda_key
GROWSPOT_LAND_MASK_GEOJSON=/absolute/path/to/ne_10m_land.geojson
```

### Run Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`.

### Run Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## 2) Backend Container Deployment (IBM Code Engine)

The repository includes `backend/Dockerfile`.

```bash
cd backend
docker build -t us.icr.io/<namespace>/growspot-api:latest .
docker push us.icr.io/<namespace>/growspot-api:latest
```

Then deploy with Code Engine and set runtime env vars:

```bash
ibmcloud ce app create \
  --name growspot-api \
  --image us.icr.io/<namespace>/growspot-api:latest \
  --env IBM_CLOUD_API_KEY=<key> \
  --env WATSONX_PROJECT_ID=<project_id> \
  --env WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  --env FRONTEND_URL=<frontend_url>
```

## 3) Frontend Deployment

Deploy `frontend/` to Vercel (recommended) or another Node host.

Set:

- `NEXT_PUBLIC_BACKEND_URL=https://<backend-domain>`

## 4) Smoke Checks

- Open frontend and click a land location on the map
- Verify `/api/v1/map-preflight` allows analysis on land
- Verify `/api/v1/analyze` returns populated `features` and `risk_analysis`
