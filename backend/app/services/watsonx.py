import os
import warnings
import re
from functools import lru_cache
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.credentials import Credentials
from dotenv import load_dotenv

# Suppress IBM SDK deprecation and 3rd party warnings for clean terminal output
warnings.filterwarnings("ignore")
load_dotenv(dotenv_path="../.env")


@lru_cache(maxsize=8)
def get_watsonx_model(max_new_tokens: int = 150):
    """Initializes the IBM watsonx.ai model. Separate cache entries per max_new_tokens (risk vs portfolio)."""
    api_key = os.getenv("IBM_CLOUD_API_KEY")
    project_id = os.getenv("WATSONX_PROJECT_ID")
    url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

    if not api_key or not project_id:
        return None

    credentials = Credentials(
        api_key=api_key,
        url=url
    )

    model_id = "ibm/granite-8b-code-instruct"

    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS: max_new_tokens,
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
    model = get_watsonx_model(150)

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


def analyze_regional_env_insight_watson(features: dict, forecast_summary: dict) -> str | None:
    """
    Regional narrative without per-crop scores: what generally grows well under these conditions.
    Used on initial map analyze (before user picks a crop from catalog).
    """
    model = get_watsonx_model(220)
    if not model:
        return None

    prompt = f"""You are an agricultural advisor. Use ONLY the environmental facts below — do not invent numbers.

Site facts:
- Soil: {features.get('soil_type', 'Unknown')}
- NDVI current / historical: {features.get('ndvi_current')} / {features.get('ndvi_historical')}
- Rainfall 30d (mm): {features.get('rainfall_30d_mm')}
- Avg temperature (C): {features.get('temp_avg_c')}
- 7-day outlook summary: cumulative_rain_mm={forecast_summary.get('cumulative_rain_mm')}, max_high_c={forecast_summary.get('max_high_c')}, min_low_c={forecast_summary.get('min_low_c')}, days_high_ge_32c={forecast_summary.get('days_high_ge_32c')}, max_consecutive_dry_days={forecast_summary.get('max_consecutive_dry_days')}

Write exactly 2 or 3 sentences on what broad categories of crops (e.g. cool-season vs warm-season, drought-tolerant vs water-loving) are more or less likely to succeed here and why. Do not name specific catalog scores.

You MUST reply in exactly this format with NO other text:
INSIGHT: [your text]

Reply:
"""

    try:
        generated = (model.generate_text(prompt=prompt) or "").strip()
        m = re.search(r"INSIGHT:\s*(.+)", generated, re.DOTALL | re.IGNORECASE)
        if m:
            return m.group(1).strip()
        print(f"Failed to parse regional env insight: {generated}")
        return None
    except Exception as e:
        print(f"Error querying Watsonx regional env insight: {e}")
        return None


def fallback_regional_env_insight(features: dict, forecast_summary: dict) -> str:
    soil = features.get("soil_type", "Unknown")
    rain = float(features.get("rainfall_30d_mm", 0))
    t = float(features.get("temp_avg_c", 20))
    hot_days = forecast_summary.get("days_high_ge_32c", 0)
    dry_streak = forecast_summary.get("max_consecutive_dry_days", 0)
    return (
        f"From modeled conditions (soil {soil}, ~{t:.0f}°C average, {rain:.0f} mm rain / 30d, "
        f"{hot_days} hot day(s) and up to {dry_streak} dry day(s) in the next-week proxy), "
        f"expect warm-season and drought-tolerant options to fare better when moisture is limited, "
        f"and water-loving or cool-season crops to need irrigation or timing adjustments. "
        f"Open Crop outlook and search the catalog for a specific crop to load tailored suitability."
    )


def analyze_crop_portfolio_with_watson(
    features: dict,
    forecast_summary: dict,
    crops_for_prompt: list[dict],
) -> dict[str, tuple[str, str]]:
    """
    Second watsonx call: batch risks/mitigations for a subset of crops.
    Returns map of crop label -> (risks_text, mitigate_text). Empty if offline/unparsed.
    """
    model = get_watsonx_model(420)
    if not model or not crops_for_prompt:
        return {}

    lines: list[str] = []
    for c in crops_for_prompt:
        stress = c.get("stress") or {}
        flags = ", ".join(k for k, v in stress.items() if v) or "none"
        lines.append(
            f"- {c['label']}: suitability={c.get('suitability_score')} band={c.get('band')}; "
            f"stress_flags=[{flags}]; note={c.get('deterministic_notes', '')[:160]}"
        )
    crop_lines = "\n".join(lines)

    prompt = f"""You are an agricultural advisor. Use ONLY the data below — do not invent weather numbers.

Site context:
- Soil: {features.get('soil_type', 'Unknown')}
- NDVI current / historical: {features.get('ndvi_current')} / {features.get('ndvi_historical')}
- Rainfall 30d (mm): {features.get('rainfall_30d_mm')}
- Avg temperature (C): {features.get('temp_avg_c')}
- 7-day outlook summary: cumulative_rain_mm={forecast_summary.get('cumulative_rain_mm')}, max_high_c={forecast_summary.get('max_high_c')}, min_low_c={forecast_summary.get('min_low_c')}, days_high_ge_32c={forecast_summary.get('days_high_ge_32c')}, max_consecutive_dry_days={forecast_summary.get('max_consecutive_dry_days')}

Crops (deterministic ranking hints):
{crop_lines}

For EACH crop listed above, write one concise risk line and one concise mitigation line.

You MUST reply using ONLY blocks in this exact shape (repeat for every crop, same order as listed):
CROP: <exact crop name from list>
RISKS: <single line>
MITIGATE: <single line>
---
(End each crop with a line containing only ---)

Reply:
"""

    try:
        raw = model.generate_text(prompt=prompt)
        text = (raw or "").strip()
        return _parse_portfolio_response(text, [c["label"] for c in crops_for_prompt])
    except Exception as e:
        print(f"Error querying Watsonx portfolio: {e}")
        return {}


def _parse_portfolio_response(text: str, expected_labels: list[str]) -> dict[str, tuple[str, str]]:
    """Parse CROP/RISKS/MITIGATE blocks separated by ---."""
    out: dict[str, tuple[str, str]] = {}
    parts = re.split(r"\n---\s*\n", text)
    for part in parts:
        block = part.strip()
        if not block:
            continue
        m_crop = re.search(r"^CROP:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
        m_risks = re.search(r"^RISKS:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
        m_mit = re.search(r"^MITIGATE:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
        if not (m_crop and m_risks and m_mit):
            continue
        label = m_crop.group(1).strip()
        risks = m_risks.group(1).strip()
        mit = m_mit.group(1).strip()
        if label and risks and mit:
            out[label] = (risks, mit)

    # Match expected labels leniently (model may vary spacing/case)
    normalized: dict[str, tuple[str, str]] = {}
    lower_map = {lbl.lower(): lbl for lbl in out.keys()}
    for exp in expected_labels:
        key = exp.strip()
        if key in out:
            normalized[key] = out[key]
            continue
        lo = key.lower()
        if lo in lower_map:
            orig = lower_map[lo]
            normalized[key] = out[orig]
    return normalized

