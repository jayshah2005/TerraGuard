def predict_risk(features: dict, crop_type: str = "Maize") -> tuple[float, str]:
    """
    A lightweight deterministic ML model proxy for the hackathon.
    In a real scenario, this would load a pre-trained scikit-learn model.
    """
    ndvi_current = features.get("ndvi_current", 0.5)
    ndvi_historical = features.get("ndvi_historical", 0.5)
    rainfall = features.get("rainfall_30d_mm", 50)
    rain_et = features.get("rain_minus_ref_et_30d_mm")
    temp = features.get("temp_avg_c", 25)
    soil_type = features.get("soil_type", "Loam")
    
    # Feature Engineering (Delta)
    ndvi_delta = ndvi_current - ndvi_historical
    
    # Base risk score (0-100)
    score = 10.0
    
    # Crop-specific rules
    crop_lower = crop_type.lower()
    multiplier = 1.0
    if crop_lower == "rice":
        multiplier = 1.2
    elif crop_lower == "sorghum":
        multiplier = 0.8
    elif crop_lower == "wheat":
        multiplier = 0.9

    # Soil-specific modifiers (e.g. Sandy soil drains water too fast)
    soil_multiplier = 1.0
    if soil_type == "Sandy":
        soil_multiplier = 1.3 # Severe penalty if dry
    elif soil_type == "Clay":
        soil_multiplier = 0.8 # Retains moisture, less drought penalty

    # 1. Vegetation Drop Penalty
    if ndvi_delta < -0.1:
        score += (40 * multiplier)
    elif ndvi_delta < 0:
        score += (15 * multiplier)
        
    # 2. Rainfall Penalty (Assume < 20mm in 30 days is bad)
    if rainfall < 10:
        score += (35 * multiplier * soil_multiplier)
    elif rainfall < 25:
        score += (20 * multiplier * soil_multiplier)

    # 2b. Water balance when Open-Meteo FAO ET₀ is available (rain − reference ET)
    if rain_et is not None and rain_et < -35:
        score += min(22.0, abs(rain_et + 35) * 0.12) * multiplier
        
    # 3. Heat Penalty
    if temp > 32:
        score += (20 * multiplier)
    elif temp > 28:
        score += (10 * multiplier)

    # Cap score
    score = min(max(score, 0), 100)
    
    # Determine Level
    if score >= 80:
        level = "Critical"
    elif score >= 60:
        level = "High"
    elif score >= 35:
        level = "Moderate"
    else:
        level = "Low"
        
    return score, level
