"""US county context via FCC geocoder; optional USDA NASS Quick Stats when API key is set."""

from __future__ import annotations

import os
from typing import Any

import requests

FCC_BLOCK_FIND = "https://geo.fcc.gov/api/census/block/find"


def _fcc_meta(lat: float, lon: float) -> dict[str, Any] | None:
    try:
        r = requests.get(
            FCC_BLOCK_FIND,
            params={"latitude": lat, "longitude": lon, "format": "json"},
            timeout=12,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"FCC geocoder error: {e}")
        return None


def maybe_us_calibration(lat: float, lon: float) -> dict[str, Any]:
    """
    Adds US county metadata when the point is in the United States.
    County yield statistics require USDA_NASS_API_KEY (free registration).
    """
    out: dict[str, Any] = {
        "us_county_fips": None,
        "us_county_name": None,
        "us_state_code": None,
        "us_calibration_source": None,
        "us_county_crop_note": None,
    }

    js = _fcc_meta(lat, lon)
    if not js or js.get("status") != "OK":
        return out

    county = js.get("County") or {}
    st = js.get("State") or {}
    fips = county.get("FIPS")
    if not fips:
        return out

    out["us_county_fips"] = str(fips)
    out["us_county_name"] = county.get("name")
    out["us_state_code"] = st.get("code")

    key = (os.getenv("USDA_NASS_API_KEY") or "").strip()
    if key:
        out["us_calibration_source"] = "usda_nass_configured"
        out["us_county_crop_note"] = (
            "USDA NASS API key present — Quick Stats queries can be wired for county yield trends."
        )
    else:
        out["us_calibration_source"] = "fcc_geocode_only"
        out["us_county_crop_note"] = (
            "County identified via FCC census geocoder. "
            "Set USDA_NASS_API_KEY for USDA Quick Stats yield calibration."
        )

    return out
