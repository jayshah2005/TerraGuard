from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import sys
import os
import random
import hashlib
from datetime import datetime, timedelta

# Add ml folder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))

from ml.risk_model import predict_risk
from ml.suitability import summarize_forecast_stress, compute_single_crop_outlook
from app.services.crop_catalog import (
    get_catalog_summaries,
    get_profile_dict_by_id,
)
from app.services.watsonx import (
    analyze_crop_portfolio_with_watson,
    analyze_regional_env_insight_watson,
    fallback_regional_env_insight,
)

router = APIRouter()

BASELINE_RISK_CROP = "Maize"


class RegionRequest(BaseModel):
    lat: float
    lon: float
    region_name: str = "Unknown Region"
    crop_type: str | None = None
    focus_crop_id: str | None = None


class CropSummary(BaseModel):
    id: str
    label: str


class CropOutlookRow(BaseModel):
    id: str
    label: str
    suitability_score: float
    band: str
    planting_verdict: str
    planting_rationale: str
    stress: dict[str, bool] = Field(default_factory=dict)
    deterministic_notes: str
    forecast_heat_days: int = 0
    forecast_max_dry_streak: int = 0
    forecast_heat_threshold_c: float
    forecast_dry_rain_mm_per_day: float
    risks_text: str
    mitigate_text: str


class CropGuidanceItem(BaseModel):
    id: str
    label: str
    risks_text: str
    mitigate_text: str


class AnalyzeResponse(BaseModel):
    region: str
    coordinates: dict[str, float]
    crop_type: str
    features: dict
    risk_analysis: dict
    ai_insight: str | None
    forecast: list[dict]
    forecast_stress_summary: dict
    crop_outlook: list[CropOutlookRow]
    crop_guidance: list[CropGuidanceItem]
    focus_crop_id: str | None = None


def _merge_portfolio_guidance(crop_outlook: list[dict], guidance: dict[str, tuple[str, str]]) -> None:
    for row in crop_outlook:
        label = row["label"]
        if label in guidance:
            risks, mit = guidance[label]
            row["risks_text"] = risks
            row["mitigate_text"] = mit


def _build_env_bundle(req: RegionRequest):
    """Shared deterministic environment for a coordinate pair."""
    seed_val = int(hashlib.md5(f"{req.lat:.2f},{req.lon:.2f}".encode()).hexdigest(), 16)
    random.seed(seed_val)

    abs_lat = abs(req.lat)

    if abs_lat < 15:
        base_temp = random.uniform(28, 34)
        base_rain = random.uniform(120, 250)
        base_ndvi = random.uniform(0.6, 0.9)
        soil_types = ["Clay", "Loam", "Sandy Clay"]
    elif abs_lat < 35:
        base_temp = random.uniform(32, 42)
        base_rain = random.uniform(0, 30)
        base_ndvi = random.uniform(0.1, 0.3)
        soil_types = ["Sandy", "Gravel", "Aridisol"]
    else:
        base_temp = random.uniform(15, 25)
        base_rain = random.uniform(40, 90)
        base_ndvi = random.uniform(0.4, 0.7)
        soil_types = ["Loam", "Silt", "Peat"]

    soil = random.choice(soil_types)

    temp_high = base_temp + random.uniform(3, 6)
    temp_low = base_temp - random.uniform(3, 6)
    avg_temp = (temp_high + temp_low) / 2

    today_rain = max(0, base_rain / 30.0 + random.uniform(-2, 5))

    features = {
        "ndvi_current": round(base_ndvi, 2),
        "ndvi_historical": round(base_ndvi + random.uniform(-0.1, 0.1), 2),
        "rainfall_today_mm": round(today_rain, 1),
        "rainfall_30d_mm": round(base_rain, 1),
        "temp_high_c": round(temp_high, 1),
        "temp_low_c": round(temp_low, 1),
        "temp_avg_c": round(avg_temp, 1),
        "soil_type": soil,
    }

    forecast = []
    for i in range(1, 8):
        date_str = (datetime.now() + timedelta(days=i)).strftime("%a")
        day_rain = base_rain / 30.0 + random.uniform(-2, 5)
        day_temp = base_temp + random.uniform(-3, 3)
        day_temp_high = day_temp + random.uniform(3, 6)
        day_temp_low = day_temp - random.uniform(3, 6)

        forecast.append(
            {
                "day": date_str,
                "temp_high_c": round(day_temp_high, 1),
                "temp_low_c": round(day_temp_low, 1),
                "rainfall_mm": round(max(0, day_rain), 1),
            }
        )

    return features, forecast


@router.get("/crops", response_model=list[CropSummary])
async def list_crops():
    """Catalog for search UI (no suitability computed)."""
    return [CropSummary(**row) for row in get_catalog_summaries()]


@router.post("/analyze")
async def analyze_region(req: RegionRequest):
    try:
        features, forecast = _build_env_bundle(req)
        forecast_stress_summary = summarize_forecast_stress(forecast)

        focus_id = (req.focus_crop_id or "").strip() or None

        if focus_id:
            profile = get_profile_dict_by_id(focus_id)
            if not profile:
                raise HTTPException(status_code=404, detail=f"Unknown crop id: {focus_id}")

            crop_outlook = [compute_single_crop_outlook(features, forecast, profile)]
            portfolio_map = analyze_crop_portfolio_with_watson(
                features, forecast_stress_summary, crop_outlook
            )
            _merge_portfolio_guidance(crop_outlook, portfolio_map)

            headline_crop = profile["label"]
            w_score, w_level = predict_risk(features, headline_crop)
            w_insight = None

            crop_guidance = [
                CropGuidanceItem(
                    id=row["id"],
                    label=row["label"],
                    risks_text=row["risks_text"],
                    mitigate_text=row["mitigate_text"],
                )
                for row in crop_outlook
            ]

            payload = AnalyzeResponse(
                region=req.region_name,
                coordinates={"lat": req.lat, "lon": req.lon},
                crop_type=headline_crop,
                features=features,
                risk_analysis={"score": round(w_score, 1), "level": w_level},
                ai_insight=w_insight,
                forecast=forecast,
                forecast_stress_summary=forecast_stress_summary,
                crop_outlook=[CropOutlookRow.model_validate(row) for row in crop_outlook],
                crop_guidance=crop_guidance,
                focus_crop_id=profile["id"],
            )
            return payload.model_dump()

        crop_outlook: list[dict] = []
        crop_guidance: list[CropGuidanceItem] = []

        headline_crop = BASELINE_RISK_CROP
        if req.crop_type and req.crop_type.strip():
            headline_crop = req.crop_type.strip()
        w_score, w_level = predict_risk(features, headline_crop)

        regional = analyze_regional_env_insight_watson(features, forecast_stress_summary)
        if regional:
            w_insight = regional
        else:
            w_insight = fallback_regional_env_insight(features, forecast_stress_summary)

        payload = AnalyzeResponse(
            region=req.region_name,
            coordinates={"lat": req.lat, "lon": req.lon},
            crop_type=headline_crop,
            features=features,
            risk_analysis={"score": round(w_score, 1), "level": w_level},
            ai_insight=w_insight,
            forecast=forecast,
            forecast_stress_summary=forecast_stress_summary,
            crop_outlook=crop_outlook,
            crop_guidance=crop_guidance,
            focus_crop_id=None,
        )
        return payload.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
