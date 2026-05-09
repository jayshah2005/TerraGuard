from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.weather import get_historical_weather
from app.services.watsonx import generate_insight
import sys
import os

# Add ml directory to path to import risk_model
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from ml.risk_model import predict_risk

router = APIRouter()

class RegionRequest(BaseModel):
    lat: float
    lon: float
    region_id: str = "custom"

@router.get("/health")
async def health_check():
    return {"status": "online", "version": "1.0.0"}

@router.post("/analysis/region")
async def analyze_region(request: RegionRequest):
    try:
        # 1. Fetch real weather data (Open-Meteo)
        weather_data = get_historical_weather(request.lat, request.lon)
        
        if not weather_data:
            raise HTTPException(status_code=500, detail="Failed to fetch weather data")
            
        # 2. Simulate NDVI data fetch (For hackathon reliability)
        # In a real scenario, this would query Sentinel Hub or a local GeoTIFF
        mock_ndvi_current = 0.35
        mock_ndvi_historical = 0.55
        
        # 3. Calculate Aggregates for ML Model
        rainfall_30d = sum(day['precipitation'] for day in weather_data)
        temp_avg = sum(day['temperature_max'] for day in weather_data) / len(weather_data)
        
        # 4. ML Prediction
        features = {
            "ndvi_current": mock_ndvi_current,
            "ndvi_historical": mock_ndvi_historical,
            "rainfall_30d_mm": rainfall_30d,
            "temp_avg_c": temp_avg
        }
        
        risk_score, risk_level = predict_risk(features)
        
        # 5. watsonx.ai Generation
        insight = generate_insight(features, risk_level)
        
        return {
            "coordinates": {"lat": request.lat, "lon": request.lon},
            "environmental_data": features,
            "risk_analysis": {
                "score": risk_score,
                "level": risk_level,
            },
            "ai_insight": insight,
            "historical_weather": weather_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
