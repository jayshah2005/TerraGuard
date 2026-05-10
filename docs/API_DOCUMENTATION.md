# API Documentation

GrowSpot exposes a FastAPI backend. Interactive OpenAPI docs are available at:

- `http://localhost:8000/docs` (Swagger UI)
- `http://localhost:8000/redoc` (ReDoc)

## Base URL

`http://localhost:8000/api/v1`

## Core Endpoints

### GET `/`

Backend status message.

Example response:

```json
{
  "message": "GrowSpot API is running. Access /docs for Swagger UI."
}
```

### GET `/api/v1/crops`

Returns lightweight crop catalog entries for search/autocomplete.

Example response:

```json
[
  { "id": "maize", "label": "Maize" },
  { "id": "rice", "label": "Rice" }
]
```

### GET `/api/v1/map-preflight?lat={lat}&lon={lon}`

Validates whether a click is on mapped land before running full analysis.

Example response:

```json
{
  "allow_analysis": false,
  "reason": "not_on_land",
  "message": "This point is not on mapped land (ocean or similar). Click dry land to run regional analysis.",
  "detail": null
}
```

### POST `/api/v1/analyze`

Runs full environmental analysis, risk scoring, and AI insight generation.

Request body:

```json
{
  "lat": -1.29,
  "lon": 36.82,
  "region_name": "Custom Region (-1.29, 36.82)",
  "crop_type": "Maize",
  "focus_crop_id": null
}
```

Notes:

- `focus_crop_id` is optional. When provided, the response returns a focused plant outlook row for that crop.
- Without `focus_crop_id`, the response returns a regional insight and `suggested_crop_outlook`.

High-level response shape:

```json
{
  "region": "Custom Region (-1.29, 36.82)",
  "coordinates": { "lat": -1.29, "lon": 36.82 },
  "crop_type": "Maize",
  "features": {},
  "risk_analysis": { "score": 54.2, "level": "Moderate" },
  "ai_insight": "Regional plain-language insight...",
  "forecast": [],
  "forecast_stress_summary": {},
  "crop_outlook": [],
  "crop_guidance": [],
  "focus_crop_id": null,
  "weather_source": "open_meteo",
  "suggested_crop_outlook": []
}
```

## Error Behavior

- `404`: Unknown `focus_crop_id`
- `500`: Unexpected server-side analysis failure
