"""
Open-Meteo historical (archive) + forecast APIs for TerraGuard.
"""

from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any

import requests

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def get_historical_weather(lat: float, lon: float, days: int = 45) -> list[dict[str, Any]]:
    """
    Fetches historical daily weather from Open-Meteo archive API.
    Returns rows: date (YYYY-MM-DD), temperature_max, temperature_min, precipitation (mm).
    """
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration",
        "timezone": "auto",
    }

    try:
        response = requests.get(ARCHIVE_URL, params=params, timeout=20)
        response.raise_for_status()
        data = response.json()

        daily_data = data.get("daily", {})
        times = daily_data.get("time", [])
        temp_max = daily_data.get("temperature_2m_max", [])
        temp_min = daily_data.get("temperature_2m_min", [])
        precip = daily_data.get("precipitation_sum", [])
        et0 = daily_data.get("et0_fao_evapotranspiration", [])

        formatted_data: list[dict[str, Any]] = []
        for i in range(len(times)):
            et = None
            if i < len(et0) and et0[i] is not None:
                et = round(float(et0[i]), 2)
            formatted_data.append(
                {
                    "date": times[i],
                    "temperature_max": float(temp_max[i]) if temp_max[i] is not None else 0.0,
                    "temperature_min": float(temp_min[i]) if temp_min[i] is not None else 0.0,
                    "precipitation": float(precip[i]) if precip[i] is not None else 0.0,
                    "et0_mm": et,
                }
            )
        return formatted_data
    except Exception as e:
        print(f"Error fetching historical weather data: {e}")
        return []


def get_forecast_daily(lat: float, lon: float, forecast_days: int = 8) -> list[dict[str, Any]]:
    """
    Daily forecast: today + next days in local timezone from Open-Meteo.
    Each row: date_iso, day (weekday label), temp_high_c, temp_low_c, rainfall_mm.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "forecast_days": forecast_days,
        "timezone": "auto",
    }
    try:
        response = requests.get(FORECAST_URL, params=params, timeout=20)
        response.raise_for_status()
        data = response.json()
        daily = data.get("daily", {})
        times = daily.get("time", [])
        tmax = daily.get("temperature_2m_max", [])
        tmin = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        rows: list[dict[str, Any]] = []
        for i in range(len(times)):
            d = times[i]
            try:
                dt = datetime.strptime(d, "%Y-%m-%d")
                day_label = dt.strftime("%a")
            except ValueError:
                day_label = d
            rows.append(
                {
                    "date_iso": d,
                    "day": day_label,
                    "temp_high_c": round(float(tmax[i]), 1) if i < len(tmax) and tmax[i] is not None else 0.0,
                    "temp_low_c": round(float(tmin[i]), 1) if i < len(tmin) and tmin[i] is not None else 0.0,
                    "rainfall_mm": round(max(0.0, float(precip[i])), 1) if i < len(precip) and precip[i] is not None else 0.0,
                }
            )
        return rows
    except Exception as e:
        print(f"Error fetching forecast weather data: {e}")
        return []


def _parse_hist_date(row: dict[str, Any]) -> date | None:
    try:
        return datetime.strptime(str(row["date"]), "%Y-%m-%d").date()
    except (ValueError, KeyError):
        return None


def rainfall_30d_mm_complete_days(historical: list[dict[str, Any]]) -> float:
    """
    Sum precipitation over the last 30 **complete** UTC days (exclude today from archive
    so we do not mix partial today's totals).
    """
    today_utc = datetime.utcnow().date()
    cutoff = today_utc - timedelta(days=1)

    dated: list[tuple[date, float]] = []
    for row in historical:
        d = _parse_hist_date(row)
        if d is None or d > cutoff:
            continue
        dated.append((d, float(row.get("precipitation", 0) or 0)))

    dated.sort(key=lambda x: x[0])
    last30 = dated[-30:] if len(dated) >= 30 else dated
    return round(sum(p for _, p in last30), 1)


def ref_et_30d_mm_complete_days(historical: list[dict[str, Any]]) -> float | None:
    """Sum FAO reference ET₀ over the same trailing window as rainfall_30d_mm (needs et0_mm on each row)."""
    today_utc = datetime.utcnow().date()
    cutoff = today_utc - timedelta(days=1)

    dated: list[tuple[date, dict[str, Any]]] = []
    for row in historical:
        d = _parse_hist_date(row)
        if d is None or d > cutoff:
            continue
        dated.append((d, row))

    dated.sort(key=lambda x: x[0])
    last30 = dated[-30:] if len(dated) >= 30 else dated
    if not last30:
        return None
    s = 0.0
    for _, row in last30:
        if row.get("et0_mm") is None:
            return None
        s += float(row["et0_mm"])
    return round(s, 1)


def rain_minus_ref_et_30d_mm(historical: list[dict[str, Any]]) -> float | None:
    """Plant-available water hint: P − ET₀ over recent complete days (Open-Meteo archive)."""
    et = ref_et_30d_mm_complete_days(historical)
    if et is None:
        return None
    rain = rainfall_30d_mm_complete_days(historical)
    return round(rain - et, 1)


def build_et_balance_features(historical: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "ref_et_30d_mm": ref_et_30d_mm_complete_days(historical),
        "rain_minus_ref_et_30d_mm": rain_minus_ref_et_30d_mm(historical),
        "evapotranspiration_source": "open_meteo_fao_et0",
    }


def assemble_weather_features(
    lat: float,
    lon: float,
    historical: list[dict[str, Any]],
    forecast_daily: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """
    Build feature dict fragment for temp/rain only (caller merges NDVI/soil).
    Uses forecast index 0 for 'today' card; returns None if forecast missing.
    """
    if not forecast_daily:
        return None

    today_row = forecast_daily[0]
    th = float(today_row["temp_high_c"])
    tl = float(today_row["temp_low_c"])
    avg = (th + tl) / 2.0
    today_rain = float(today_row["rainfall_mm"])
    rain30 = rainfall_30d_mm_complete_days(historical)

    return {
        "rainfall_today_mm": round(today_rain, 1),
        "rainfall_30d_mm": rain30,
        "temp_high_c": round(th, 1),
        "temp_low_c": round(tl, 1),
        "temp_avg_c": round(avg, 1),
    }


def forecast_for_chart(forecast_daily: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Next 7 days after today — indices 1..7 — matching prior synthetic behavior (no 'today' on chart).
    """
    out: list[dict[str, Any]] = []
    for row in forecast_daily[1:8]:
        out.append(
            {
                "day": row["day"],
                "temp_high_c": row["temp_high_c"],
                "temp_low_c": row["temp_low_c"],
                "rainfall_mm": row["rainfall_mm"],
            }
        )
    return out
