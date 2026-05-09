def predict_risk(features: dict) -> tuple[float, str]:
    """
    A lightweight deterministic ML model proxy for the hackathon.
    In a real scenario, this would load a pre-trained scikit-learn model 
    (e.g., joblib.load('random_forest.pkl')) and run `model.predict(X)`.
    
    For the sake of a reliable hackathon demo without needing to bundle large
    pkl files or deal with imbalanced synthetic datasets, we use a 
    heuristic based on the same features a linear regression would weight.
    """
    
    ndvi_current = features.get("ndvi_current", 0.5)
    ndvi_historical = features.get("ndvi_historical", 0.5)
    rainfall = features.get("rainfall_30d_mm", 50)
    temp = features.get("temp_avg_c", 25)
    
    # Feature Engineering (Delta)
    ndvi_delta = ndvi_current - ndvi_historical
    
    # Base risk score (0-100)
    score = 10.0
    
    # 1. Vegetation Drop Penalty
    if ndvi_delta < -0.1:
        score += 40
    elif ndvi_delta < 0:
        score += 15
        
    # 2. Rainfall Penalty (Assume < 20mm in 30 days is bad)
    if rainfall < 10:
        score += 35
    elif rainfall < 25:
        score += 20
        
    # 3. Heat Penalty
    if temp > 32:
        score += 20
    elif temp > 28:
        score += 10
        
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
        
    return round(score, 1), level
