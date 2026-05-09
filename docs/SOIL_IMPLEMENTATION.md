# TerraGuard Soil Analytics Implementation

## Overview
TerraGuard deeply factors underlying soil hydrology into agricultural vulnerability. Certain crops behave severely differently during drought or flood patterns depending on the baseline soil substrate holding them. For example, Maize planted in Sandy soil drains water drastically faster, exacerbating short-term drought impacts, whilst Clay soil retains water securely, mitigating minor heatwaves.

## Production Data Fetching (ISRIC SoilGrids API)
During the hackathon scale MVP, the exact GeoJSON lookup boundary fetch has been deterministically seeded/mocked via the `hashlib` python library against coordinates. 

To transition this to production, replace the pseudo-random hashing generation with the ISRIC Rest API:

### Architecture Modification:
```python
import requests

def get_soil_type_from_coords(lat: float, lon: float) -> str:
    """
    Production Implementation replacing hashlib mocks.
    Fetches the highest probability soil classification at a given coordinate block.
    """
    try:
        url = f"https://rest.soilgrids.org/soilgrids/v2.0/classification/query?lon={lon}&lat={lat}&number_classes=1"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        # Parse ISRIC standard classifications
        major_class = data['wrb_class_name']
        if "Arenosols" in major_class: return "Sandy"
        if "Vertisols" in major_class: return "Clay"
        return "Loam"
    except Exception:
        return "Unknown" # Graceful fallback to Loam baseline in model
```

## AI Pipeline Integration
Our `ml/risk_model.py` natively injects the discovered soil topology:
1. `Sandy` Modifier: `multiplier = 1.3` is applied against the standard drought-penalty.
2. `Clay` Modifier: `multiplier = 0.8` buffers short-term arid spans.
3. This is piped into **IBM watsonx.ai** as a primary metric payload so the foundation models directly synthesize the soil classification when predicting the final NLP insights given to the farmers.
