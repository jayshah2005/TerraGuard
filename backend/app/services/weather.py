import requests
from datetime import datetime, timedelta

def get_historical_weather(lat: float, lon: float, days: int = 30) -> list:
    """
    Fetches historical daily weather data from Open-Meteo API.
    """
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    url = f"https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
        "timezone": "auto"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        daily_data = data.get("daily", {})
        times = daily_data.get("time", [])
        temp_max = daily_data.get("temperature_2m_max", [])
        temp_min = daily_data.get("temperature_2m_min", [])
        precip = daily_data.get("precipitation_sum", [])
        
        formatted_data = []
        for i in range(len(times)):
            formatted_data.append({
                "date": times[i],
                "temperature_max": temp_max[i] if temp_max[i] is not None else 0,
                "temperature_min": temp_min[i] if temp_min[i] is not None else 0,
                "precipitation": precip[i] if precip[i] is not None else 0,
            })
            
        return formatted_data
        
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return []
