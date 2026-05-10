"""catalog_suggestions diversity pick — smoke test."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.catalog_suggestions import DEFAULT_LIMIT, build_suggested_crop_outlook


def _minimal_features() -> dict:
    return {
        "soil_type": "Loam",
        "ndvi_current": 0.55,
        "ndvi_historical": 0.52,
        "rainfall_30d_mm": 90.0,
        "rainfall_today_mm": 2.0,
        "temp_high_c": 28.0,
        "temp_low_c": 16.0,
        "temp_avg_c": 22.0,
    }


def _minimal_forecast() -> list[dict]:
    out = []
    for i in range(7):
        out.append(
            {
                "day": f"D{i}",
                "temp_high_c": 26.0 + i * 0.1,
                "temp_low_c": 14.0,
                "rainfall_mm": 3.0,
            }
        )
    return out


def test_suggestions_length_and_unique_ids():
    rows = build_suggested_crop_outlook(_minimal_features(), _minimal_forecast(), limit=DEFAULT_LIMIT)
    assert len(rows) <= DEFAULT_LIMIT
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids))
