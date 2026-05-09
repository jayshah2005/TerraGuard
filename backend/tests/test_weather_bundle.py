"""Tests for Open-Meteo integration and cache (mocked; no network required)."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.routes import RegionRequest, _resolve_weather_bundle


def _minimal_agronomic(lat, lon, hist, weather_source):
    """Avoid outbound SoilGrids/MODIS/terrain calls during tests."""
    return {
        "soil_type": "Loam",
        "soil_source": "synthetic",
        "soil_wrb_class_name": None,
        "soil_probability_top": None,
        "ndvi_current": 0.5,
        "ndvi_historical": 0.5,
        "vegetation_source": "synthetic",
        "ndvi_current_modis_date": None,
        "ndvi_historical_modis_date": None,
        "elevation_m": None,
        "slope_deg": None,
        "terrain_source": "error",
        "gdd_base_temp_c": 10.0,
        "gdd_accum_season_cd": 0.0,
        "gdd_30d_cd": 0.0,
        "gdd_source": "open_meteo_archive",
        "ref_et_30d_mm": None,
        "rain_minus_ref_et_30d_mm": None,
        "evapotranspiration_source": "open_meteo_fao_et0",
        "us_county_fips": None,
        "us_county_name": None,
        "us_state_code": None,
        "us_calibration_source": None,
        "us_county_crop_note": None,
        "pest_pressure_hints": [],
        "planting_calendar_note": "",
        "agronomic_hints_source": "static_heuristic",
        "soil_moisture_index": None,
        "soil_moisture_source": "unavailable",
    }


def _eight_day_forecast_rows():
    base = datetime.utcnow().date()
    rows = []
    for i in range(8):
        d = base + timedelta(days=i)
        rows.append(
            {
                "date_iso": d.isoformat(),
                "day": d.strftime("%a"),
                "temp_high_c": 12.0,
                "temp_low_c": 4.0,
                "rainfall_mm": 1.0,
            }
        )
    return rows


def test_open_meteo_path_merges_vegetation():
    hist = []
    y = datetime.utcnow().date() - timedelta(days=1)
    for i in range(30):
        d = y - timedelta(days=i)
        hist.append(
            {
                "date": d.isoformat(),
                "temperature_max": 10.0,
                "temperature_min": 4.0,
                "precipitation": 2.0,
            }
        )

    with patch("app.api.routes.weather_cache.read_valid", return_value=None):
        with patch("app.api.routes.merge_agronomic_site_features", side_effect=_minimal_agronomic):
            with patch("app.api.routes.get_historical_weather", return_value=hist):
                with patch("app.api.routes.get_forecast_daily", return_value=_eight_day_forecast_rows()):
                    req = RegionRequest(lat=1.0, lon=1.0, region_name="T")
                    features, forecast, source = _resolve_weather_bundle(req)
                    assert source == "open_meteo"
                    assert "ndvi_current" in features
                    assert "soil_type" in features
                    assert len(forecast) == 7
                    assert features["rainfall_30d_mm"] == 60.0


def test_synthetic_fallback_when_forecast_empty():
    with patch("app.api.routes.weather_cache.read_valid", return_value=None):
        with patch("app.api.routes.merge_agronomic_site_features", side_effect=_minimal_agronomic):
            with patch("app.api.routes.get_historical_weather", return_value=[]):
                with patch("app.api.routes.get_forecast_daily", return_value=[]):
                    req = RegionRequest(lat=51.0, lon=-0.1, region_name="X")
                    features, forecast, source = _resolve_weather_bundle(req)
                    assert source == "synthetic_fallback"
                    assert len(forecast) == 7


def test_cache_hit_skips_fetch():
    fc = _eight_day_forecast_rows()
    payload = {
        "historical": [
            {
                "date": (datetime.utcnow().date() - timedelta(days=1)).isoformat(),
                "temperature_max": 8.0,
                "temperature_min": 2.0,
                "precipitation": 1.0,
            }
        ],
        "forecast_daily": fc,
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "source": "open-meteo",
    }
    with patch("app.api.routes.weather_cache.read_valid", return_value=payload):
        with patch("app.api.routes.merge_agronomic_site_features", side_effect=_minimal_agronomic):
            with patch("app.api.routes.get_historical_weather") as mh:
                with patch("app.api.routes.get_forecast_daily") as mf:
                    req = RegionRequest(lat=10.0, lon=20.0, region_name="T")
                    _, _, source = _resolve_weather_bundle(req)
                    assert source == "open_meteo"
                    mh.assert_not_called()
                    mf.assert_not_called()


if __name__ == "__main__":
    test_open_meteo_path_merges_vegetation()
    test_synthetic_fallback_when_forecast_empty()
    test_cache_hit_skips_fetch()
    print("ok")
