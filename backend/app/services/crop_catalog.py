"""Load crop profiles from JSON for data-driven suitability scoring."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

from pydantic import BaseModel, Field


class CropProfile(BaseModel):
    id: str
    label: str
    temp_optimal_min_c: float
    temp_optimal_max_c: float
    heat_stress_temp_c: float
    cold_stress_temp_c: float
    rainfall_30d_min_mm: float
    rainfall_30d_ideal_min_mm: float
    rainfall_30d_ideal_max_mm: float
    drought_severe_mm: float
    waterlogging_rain_mm: float
    preferred_soils: list[str] = Field(default_factory=list)
    avoid_soils: list[str] = Field(default_factory=list)
    forecast_heat_day_c: float
    forecast_dry_day_mm: float
    ndvi_stress_threshold_delta: float

    def model_dump_public(self) -> dict[str, Any]:
        return self.model_dump()


def _catalog_path() -> str:
    base = os.path.dirname(__file__)
    return os.path.normpath(os.path.join(base, "..", "..", "data", "crops.json"))


@lru_cache(maxsize=1)
def load_crop_profiles() -> tuple[CropProfile, ...]:
    path = _catalog_path()
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    return tuple(CropProfile.model_validate(row) for row in raw)


def get_profiles_as_dicts() -> list[dict[str, Any]]:
    return [p.model_dump_public() for p in load_crop_profiles()]


def get_catalog_summaries() -> list[dict[str, str]]:
    """Lightweight id + label for search UI (no scoring)."""
    return [{"id": p.id, "label": p.label} for p in load_crop_profiles()]


def get_profile_dict_by_id(crop_id: str) -> dict[str, Any] | None:
    cid = crop_id.strip().lower()
    for p in load_crop_profiles():
        if p.id.lower() == cid:
            return p.model_dump_public()
    return None
