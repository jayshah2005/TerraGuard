"""
Elevation (SRTM via OpenTopoData) and coarse slope from a five-point stencil.
"""

from __future__ import annotations

import math
from typing import Any

import requests

from app.services import terrain_cache

OPENTOPO_SRTM = "https://api.opentopodata.org/v1/srtm90m"


def _fetch_elevations(locations: list[tuple[float, float]]) -> list[float | None]:
    """locations as (lat, lng) per OpenTopoData convention."""
    if not locations:
        return []
    loc_str = "|".join(f"{lat},{lng}" for lat, lng in locations)
    try:
        r = requests.get(OPENTOPO_SRTM, params={"locations": loc_str}, timeout=15)
        r.raise_for_status()
        data = r.json()
        out: list[float | None] = []
        for res in data.get("results") or []:
            el = res.get("elevation")
            out.append(float(el) if el is not None else None)
        return out
    except Exception as e:
        print(f"OpenTopoData error: {e}")
        return [None] * len(locations)


def fetch_terrain_bundle(lat: float, lon: float) -> dict[str, Any]:
    cached = terrain_cache.read_valid(lat, lon)
    if cached and cached.get("elevation_m") is not None:
        return {
            "elevation_m": cached.get("elevation_m"),
            "slope_deg": cached.get("slope_deg"),
            "terrain_source": cached.get("terrain_source", "opentopodata_srtm90m"),
        }

    delta = 0.00125  # ~140 m latitude step
    cos_lat = max(0.2, math.cos(math.radians(lat)))
    dlon = delta / cos_lat

    pts = [
        (lat, lon),
        (lat + delta, lon),
        (lat - delta, lon),
        (lat, lon + dlon),
        (lat, lon - dlon),
    ]
    elevs = _fetch_elevations(pts)
    if len(elevs) < 5 or elevs[0] is None:
        return {
            "elevation_m": None,
            "slope_deg": None,
            "terrain_source": "error",
        }

    c, n, s, e, w = elevs[:5]
    assert c is not None
    dy_m = 2 * delta * 111_000.0
    dx_m = 2 * dlon * 111_000.0 * cos_lat
    slope_deg = None
    if None not in (n, s, e, w) and dy_m > 1 and dx_m > 1:
        dz_dy = (float(n) - float(s)) / dy_m
        dz_dx = (float(e) - float(w)) / dx_m
        slope_rad = math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy)
        slope_deg = round(math.degrees(math.atan(slope_rad)), 2)

    payload = {
        "elevation_m": round(float(c), 1),
        "slope_deg": slope_deg,
        "terrain_source": "opentopodata_srtm90m",
    }
    terrain_cache.write_payload(lat, lon, payload)
    return payload
