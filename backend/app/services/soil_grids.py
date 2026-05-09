"""
ISRIC SoilGrids v2 classification → TerraGuard soil buckets (Sandy / Clay / Loam / …).
REST base: https://rest.isric.org/soilgrids/v2.0/classification/query
"""

from __future__ import annotations

import hashlib
import random
import re
from typing import Any

import requests

from app.services import soil_cache

CLASSIFICATION_URL = "https://rest.isric.org/soilgrids/v2.0/classification/query"

# WRB 2022(+legacy) fragments → catalog soil labels used by crops.json / risk_model.
# Order matters: first match wins (more specific prefixes first).
_WRB_TO_LABEL: list[tuple[str, str]] = [
    (r"Arenosols", "Sandy"),
    (r"Psamm", "Sandy"),
    (r"Podzols", "Sandy"),
    (r"Histosols", "Peat"),
    (r"Vertisols", "Clay"),
    (r"Solonetz", "Clay"),
    (r"Vertic", "Clay"),
    (r"Luvisols", "Loam"),
    (r"Cambisols", "Loam"),
    (r"Fluvisols", "Loam"),
    (r"Gleysols", "Clay"),
    (r"Chernozems", "Loam"),
    (r"Kastanozems", "Loam"),
    (r"Phaeozems", "Loam"),
    (r"Andosols", "Loam"),
    (r"Albeluvisols", "Loam"),
    (r"Acrisols", "Sandy"),
    (r"Lixisols", "Sandy"),
    (r"Nitisols", "Clay"),
    (r"Ferralsols", "Loam"),
    (r"Planosols", "Clay"),
    (r"Stagnosols", "Clay"),
    (r"Umbrisols", "Loam"),
    (r"Gypsisols", "Sandy"),
    (r"Durisols", "Sandy"),
    (r"Calcisols", "Loam"),
    (r"Anthrosols", "Loam"),
    (r"Technosols", "Loam"),
    (r"Regosols", "Gravel"),
    (r"Leptosols", "Gravel"),
]


def map_wrb_to_soil_type(wrb_name: str) -> str:
    """Map SoilGrids WRB class name to coarse TerraGuard label."""
    if not wrb_name:
        return "Loam"
    for pattern, label in _WRB_TO_LABEL:
        if re.search(pattern, wrb_name, re.I):
            return label
    return "Loam"


def _fetch_classification(lat: float, lon: float) -> dict[str, Any] | None:
    params = {"lon": lon, "lat": lat, "number_classes": 3}
    try:
        r = requests.get(CLASSIFICATION_URL, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"SoilGrids classification error: {e}")
        return None


def fetch_soil_bundle(lat: float, lon: float) -> dict[str, Any]:
    """
    Returns soil_type, soil_source, optional wrb_class_name / soil_probability_top.
    Cached 7 days; degrades to synthetic-like Loam with soil_source error only if API fails.
    """
    cached = soil_cache.read_valid(lat, lon)
    if cached and cached.get("soil_type"):
        return {
            "soil_type": cached["soil_type"],
            "soil_source": cached.get("soil_source", "soilgrids_v2"),
            "soil_wrb_class_name": cached.get("soil_wrb_class_name"),
            "soil_probability_top": cached.get("soil_probability_top"),
        }

    data = _fetch_classification(lat, lon)
    if not data:
        syn = _synthetic_soil_fallback(lat, lon)
        syn["soil_source"] = "error"
        return syn

    wrb = data.get("wrb_class_name") or ""
    soil_type = map_wrb_to_soil_type(str(wrb))
    prob = data.get("wrb_class_probability")

    soil_cache.write_payload(
        lat,
        lon,
        {
            "soil_type": soil_type,
            "soil_source": "soilgrids_v2",
            "soil_wrb_class_name": wrb,
            "soil_probability_top": prob,
        },
    )

    return {
        "soil_type": soil_type,
        "soil_source": "soilgrids_v2",
        "soil_wrb_class_name": wrb,
        "soil_probability_top": prob,
    }


def _synthetic_soil_fallback(lat: float, lon: float) -> dict[str, Any]:
    """Deterministic soil label when SoilGrids fails (matches legacy buckets loosely)."""
    seed_val = int(hashlib.md5(f"{lat:.2f},{lon:.2f}".encode()).hexdigest(), 16)
    random.seed(seed_val)
    abs_lat = abs(lat)
    if abs_lat < 15:
        candidates = ["Clay", "Loam", "Sandy Clay"]
    elif abs_lat < 35:
        candidates = ["Sandy", "Gravel", "Loam"]
    else:
        candidates = ["Loam", "Silt", "Peat"]
    return {
        "soil_type": random.choice(candidates),
        "soil_source": "synthetic",
        "soil_wrb_class_name": None,
        "soil_probability_top": None,
    }
