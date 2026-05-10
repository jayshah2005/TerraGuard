# GrowSpot

GrowSpot is an AI-powered environmental intelligence platform that makes growing plants more accessible for everyone, from home gardeners and urban communities to large-scale farmers.

## Problem

Traditional growing knowledge is becoming harder to rely on as climate patterns shift unpredictably. At the same time, understanding local environmental conditions often requires technical expertise and fragmented data sources.

GrowSpot bridges this gap.

## Mission and SDG Alignment

GrowSpot supports:

- **UN SDG 4 - Quality Education** by making ecological and agricultural knowledge understandable and accessible.
- **UN SDG 11 - Sustainable Cities and Communities** by helping people grow sustainably within local ecosystems.

## What GrowSpot Does

Using over **53 environmental and weather datapoints** plus satellite, soil, terrain, and climate context, GrowSpot helps users make informed growing decisions.

The platform can:

- Recommend which plants are most suitable for a specific location
- Analyze how well a plant aligns with local environmental conditions
- Help determine sowing windows using a **7-Day Weather Threshold Check**
- Translate complex ecological signals into actionable plain-language guidance

Our goal is to democratize environmental intelligence and make sustainable growing more approachable, data-driven, and resilient in an era of climate uncertainty.

## Technical Overview

- **Frontend:** Next.js, TypeScript, Tailwind CSS, React Leaflet
- **Backend:** FastAPI (Python), service-oriented data fusion
- **Data sources:** Open-Meteo, MODIS/ORNL NDVI, ISRIC SoilGrids, OpenTopoData
- **AI layer:** IBM watsonx.ai (Granite) for narrative recommendations on top of deterministic scoring
- **Resilience:** cache-backed pipeline with graceful fallbacks for external provider failures

## API Surface

- `GET /api/v1/crops` - plant catalog for search
- `GET /api/v1/map-preflight` - land validation before full analysis
- `POST /api/v1/analyze` - regional or focused-crop analysis

## Quick Start

```bash
# backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

Required root `.env` values:

```env
IBM_CLOUD_API_KEY=...
WATSONX_PROJECT_ID=...
WATSONX_URL=https://us-south.ml.cloud.ibm.com
FRONTEND_URL=http://localhost:3000
```

Now, we demonstrate how GrowSpot works.
