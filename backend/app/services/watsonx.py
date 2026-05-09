import os
import warnings
import re
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.credentials import Credentials
from dotenv import load_dotenv

# Suppress IBM SDK deprecation and 3rd party warnings for clean terminal output
warnings.filterwarnings("ignore")
load_dotenv(dotenv_path="../.env")

def get_watsonx_model():
    """Initializes the IBM watsonx.ai model."""
    api_key = os.getenv("IBM_CLOUD_API_KEY")
    project_id = os.getenv("WATSONX_PROJECT_ID")
    url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    
    if not api_key or not project_id:
        return None
        
    credentials = Credentials(
        api_key=api_key,
        url=url
    )
    
    # Official IBM foundational model to resolve licensing/3rd party warnings
    model_id = "ibm/granite-8b-code-instruct"
    
    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS: 150,
        GenParams.MIN_NEW_TOKENS: 10,
        GenParams.TEMPERATURE: 0.3,
    }
    
    try:
        if project_id.startswith("ApiKey"):
            print("\n[ERROR] WATSONX_PROJECT_ID looks like an API Key!\n")
            return None

        model = ModelInference(
            model_id=model_id,
            params=parameters,
            credentials=credentials,
            project_id=project_id
        )
        return model
    except Exception as e:
        print(f"Failed to initialize Watsonx model: {e}")
        return None

def analyze_risk_with_watson(features: dict, crop_type: str = "Maize"):
    """Uses watsonx.ai to generate both the Risk Score, Level, and Insight based on features."""
    prompt = f"""You are an agricultural AI risk assessor. Evaluate the failure risk for {crop_type}.
Data:
- Soil: {features.get('soil_type', 'Unknown')}
- NDVI (0 to 1 scale): {features.get('ndvi_current')}
- Rainfall (30 days): {features.get('rainfall_30d_mm')} mm
- Average Temperature: {features.get('temp_avg_c')} C

Calculate the Probability of Failure (Risk Score) from 0.0 to 100.0 based on these conditions.
Classify the Risk Level as: Low, Moderate, High, or Critical.
Provide a 2-sentence insight with a safeguarding tip.

You MUST reply in exactly this format with NO other text:
SCORE: [number]
LEVEL: [level]
INSIGHT: [insight]

Reply:
"""
    model = get_watsonx_model()
    
    if not model:
        # Fallback to local deterministic if IBM Watson isn't configured
        return None, None, f"System currently in Demo Mode. AI connection offline."
        
    try:
        generated_response = model.generate_text(prompt=prompt).strip()
        
        # Parse the structured response
        score_match = re.search(r'SCORE:\s*([\d\.]+)', generated_response)
        level_match = re.search(r'LEVEL:\s*([A-Za-z]+)', generated_response)
        insight_match = re.search(r'INSIGHT:\s*(.+)', generated_response, re.DOTALL)
        
        if score_match and level_match and insight_match:
            score = float(score_match.group(1))
            level = level_match.group(1)
            insight = insight_match.group(1).strip()
            
            # Map unrecognized levels
            if level not in ["Low", "Moderate", "High", "Critical"]:
                level = "Moderate"
                
            return score, level, insight
        else:
            print(f"Failed to parse Watson response: {generated_response}")
            return None, None, generated_response.strip()
    except Exception as e:
        print(f"Error querying Watsonx: {e}")
        return None, None, "Warning: Unable to generate remote insights due to an API error."

