from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys
import os
import random
import hashlib
from datetime import datetime, timedelta

# Add ml folder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))

from ml.risk_model import predict_risk
from app.services.watsonx import analyze_risk_with_watson

router = APIRouter()

class RegionRequest(BaseModel):
    lat: float
    lon: float
    region_name: str = "Unknown Region"
    crop_type: str = "Maize"

@router.post("/analyze")
async def analyze_region(req: RegionRequest):
    try:
        # Use hashing so clicking the exact same coordinate yields the same environment.
        seed_val = int(hashlib.md5(f"{req.lat:.2f},{req.lon:.2f}".encode()).hexdigest(), 16)
        random.seed(seed_val)
        
        abs_lat = abs(req.lat)
        
        # Geographically accurate mocking based on Latitude bands
        # Equator/Tropics (0-15 deg): Hot, Wet, High NDVI
        if abs_lat < 15:
            base_temp = random.uniform(28, 34)
            base_rain = random.uniform(120, 250)
            base_ndvi = random.uniform(0.6, 0.9)
            soil_types = ["Clay", "Loam", "Sandy Clay"]
        # Desert/Arid/Subtropics (15-35 deg): Very Hot, Very Dry, Low NDVI
        elif abs_lat < 35:
            base_temp = random.uniform(32, 42)
            base_rain = random.uniform(0, 30)
            base_ndvi = random.uniform(0.1, 0.3)
            soil_types = ["Sandy", "Gravel", "Aridisol"]
        # Temperate (35+ deg): Moderate, Mod-Rain, Mod NDVI
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
            "soil_type": soil
        }
            
        # Use Watson AI for Primary Evaluation
        w_score, w_level, w_insight = analyze_risk_with_watson(features, req.crop_type)
        
        # Fallback to local deterministic if API fails or parse fails
        if w_score is None:
            w_score, w_level = predict_risk(features, req.crop_type)
            if "Demo Mode" not in w_insight:
                w_insight = f"IBM Watsonx parsing error. Local Model Analysis: {w_level} Risk."
        
        # Forecast Logic (Use local proxy to avoid hitting Watsonx API 7x times repeatedly)
        forecast = []
        for i in range(1, 8):
            date_str = (datetime.now() + timedelta(days=i)).strftime("%a")
            # Create a slight drift over the week
            day_rain = base_rain / 30.0 + random.uniform(-2, 5) # Rain per day
            day_temp = base_temp + random.uniform(-3, 3)
            day_temp_high = day_temp + random.uniform(3, 6)
            day_temp_low = day_temp - random.uniform(3, 6)
            
            forecast.append({
                "day": date_str,
                "temp_high_c": round(day_temp_high, 1),
                "temp_low_c": round(day_temp_low, 1),
                "rainfall_mm": round(max(0, day_rain), 1)
            })

        return {
            "region": req.region_name,
            "coordinates": {"lat": req.lat, "lon": req.lon},
            "crop_type": req.crop_type,
            "features": features,
            "risk_analysis": {
                "score": round(w_score, 1),
                "level": w_level
            },
            "ai_insight": w_insight,
            "forecast": forecast
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
