import os
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.credentials import Credentials

def get_watsonx_model():
    """
    Initializes the IBM watsonx.ai Granite model.
    """
    api_key = os.getenv("IBM_CLOUD_API_KEY")
    project_id = os.getenv("WATSONX_PROJECT_ID")
    url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    
    if not api_key or not project_id:
        return None
        
    credentials = Credentials(
        api_key=api_key,
        url=url
    )
    
    model_id = "ibm/granite-13b-chat-v2"
    
    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS: 100,
        GenParams.MIN_NEW_TOKENS: 10,
        GenParams.TEMPERATURE: 0.3,
    }
    
    model = Model(
        model_id=model_id,
        params=parameters,
        credentials=credentials,
        project_id=project_id
    )
    
    return model

def generate_insight(features: dict, risk_level: str) -> str:
    """
    Generates a human-readable insight based on raw features using watsonx.ai.
    Falls back to a local string if credentials aren't set (for local dev/hackathon offline mode).
    """
    prompt = f"""You are an expert agronomist AI helping a smallholder farmer. 
Analyze the following regional data and provide a concise, 2-sentence actionable insight. Do not use technical jargon.

Data:
- Current Vegetation Health (NDVI): {features['ndvi_current']} (Historical: {features['ndvi_historical']})
- 30-Day Rainfall: {features['rainfall_30d_mm']} mm
- Average Temp: {features['temp_avg_c']} C
- Assessed Risk Level: {risk_level}

Insight:"""

    try:
        model = get_watsonx_model()
        if model:
            generated_response = model.generate_text(prompt=prompt)
            return generated_response.strip()
    except Exception as e:
        print(f"watsonx.ai Generation Error: {e}")
        
    # Fallback for hackathon offline demo or if API keys are missing
    if risk_level == "Critical":
        return "The region is experiencing a critical drop in vegetation health driven by lack of rainfall. Immediate irrigation intervention is highly recommended."
    elif risk_level == "High":
        return "Vegetation health is declining. Monitor crops closely and prepare secondary water sources."
    elif risk_level == "Moderate":
        return "Conditions are mostly stable, but lower than average rainfall is present. Continue standard watering cycles."
    else:
        return "Crop health appears stable with adequate rainfall and temperature. No immediate action required."
