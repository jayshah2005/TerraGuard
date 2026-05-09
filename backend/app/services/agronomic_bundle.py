"""Merge open-data agronomic layers into the analyze feature dict."""

from __future__ import annotations

from typing import Any

from app.services import soil_grids
from app.services.calibration_us import maybe_us_calibration
from app.services.gdd import build_gdd_features
from app.services.agronomic_static import static_agronomic_hints
from app.services.terrain import fetch_terrain_bundle
from app.services.vegetation_modis import fetch_ndvi_bundle
from app.services.weather import build_et_balance_features


def merge_agronomic_site_features(
    lat: float,
    lon: float,
    historical: list[dict[str, Any]],
    weather_source: str,
) -> dict[str, Any]:
    merged: dict[str, Any] = {}

    merged.update(soil_grids.fetch_soil_bundle(lat, lon))
    merged.update(fetch_ndvi_bundle(lat, lon))
    merged.update(fetch_terrain_bundle(lat, lon))

    if weather_source == "open_meteo" and historical:
        merged.update(build_gdd_features(historical))
        merged.update(build_et_balance_features(historical))
    else:
        merged.setdefault("gdd_base_temp_c", 10.0)
        merged["gdd_accum_season_cd"] = None
        merged["gdd_30d_cd"] = None
        merged["gdd_source"] = "unavailable"
        merged["ref_et_30d_mm"] = None
        merged["rain_minus_ref_et_30d_mm"] = None
        merged["evapotranspiration_source"] = "unavailable"

    merged.update(maybe_us_calibration(lat, lon))
    merged.update(static_agronomic_hints(lat, lon))

    merged["soil_moisture_index"] = None
    merged["soil_moisture_source"] = "unavailable"

    return merged
