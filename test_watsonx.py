import sys, os
sys.path.append(os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('.env')

from app.services.watsonx import generate_insight
print(generate_insight({"soil_type": "Clay", "ndvi_current": 0.5, "rainfall_30d_mm": 100, "temp_avg_c": 25}, "High", 75))
