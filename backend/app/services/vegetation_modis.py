"""
MODIS Terra MOD13Q1 NDVI via ORNL DAAC TESViS REST (free, no API key).
Semantics:
  ndvi_current — median NDVI of latest 16-day composite whose calendar end falls within the last ~45 days.
  ndvi_historical — composite closest to the same calendar period one year ago (±24 days).
"""

from __future__ import annotations

import hashlib
import random
from datetime import date, datetime, timedelta, timezone
from statistics import median
from typing import Any

import requests

from app.services import vegetation_cache

ORNL_SUBSET = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
ORNL_DATES = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates"
HEADERS_JSON = {"Accept": "application/json"}
NDVI_BAND = "250m_16_days_NDVI"
FILL_MAX = -2500


def _synthetic_ndvi(lat: float, lon: float) -> tuple[float, float]:
    seed_val = int(hashlib.md5(f"{lat:.2f},{lon:.2f}".encode()).hexdigest(), 16)
    random.seed(seed_val)
    abs_lat = abs(lat)
    if abs_lat < 15:
        base_ndvi = random.uniform(0.6, 0.9)
    elif abs_lat < 35:
        base_ndvi = random.uniform(0.1, 0.3)
    else:
        base_ndvi = random.uniform(0.4, 0.7)
    cur = round(base_ndvi, 2)
    hist = round(base_ndvi + random.uniform(-0.1, 0.1), 2)
    return cur, hist


def _parse_calendar(dstr: str) -> date | None:
    try:
        return datetime.strptime(dstr[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _fetch_dates(lat: float, lon: float) -> list[dict[str, str]]:
    cached = vegetation_cache.read_dates(lat, lon)
    if cached:
        return cached
    try:
        r = requests.get(
            ORNL_DATES,
            params={"latitude": lat, "longitude": lon, "product": "MOD13Q1"},
            headers=HEADERS_JSON,
            timeout=25,
        )
        r.raise_for_status()
        data = r.json()
        rows = data.get("dates") or []
        vegetation_cache.write_dates(lat, lon, rows)
        return rows
    except Exception as e:
        print(f"MODIS dates error: {e}")
        return []


def _subset_json(lat: float, lon: float, modis_date: str) -> dict[str, Any] | None:
    cached = vegetation_cache.read_subset(lat, lon, modis_date)
    if cached:
        return cached
    try:
        r = requests.get(
            ORNL_SUBSET,
            params={
                "latitude": lat,
                "longitude": lon,
                "startDate": modis_date,
                "endDate": modis_date,
                "kmAboveBelow": 1,
                "kmLeftRight": 1,
            },
            headers=HEADERS_JSON,
            timeout=45,
        )
        r.raise_for_status()
        js = r.json()
        vegetation_cache.write_subset(lat, lon, modis_date, js)
        return js
    except Exception as e:
        print(f"MODIS subset {modis_date} error: {e}")
        return None


def _ndvi_from_subset(payload: dict[str, Any] | None) -> float | None:
    if not payload:
        return None
    blocks = payload.get("subset") or []
    for b in blocks:
        if b.get("band") != NDVI_BAND:
            continue
        raw = b.get("data") or []
        vals = [float(v) for v in raw if isinstance(v, (int, float)) and float(v) > FILL_MAX]
        if not vals:
            return None
        x = median(vals) * 1e-4
        return round(max(-0.2, min(1.0, x)), 4)
    return None


def _pick_current_date(rows: list[dict[str, str]], today: date) -> str | None:
    """Latest composite with calendar_date <= today and within last ~120 days."""
    candidates: list[tuple[date, str]] = []
    cutoff = today - timedelta(days=120)
    for row in rows:
        cd = _parse_calendar(row.get("calendar_date", ""))
        md = row.get("modis_date")
        if cd is None or not md:
            continue
        if cd <= today and cd >= cutoff:
            candidates.append((cd, md))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0])
    return candidates[-1][1]


def _pick_yoy_date(rows: list[dict[str, str]], today: date) -> str | None:
    """Closest composite to one calendar year ago (best effort)."""
    target = today - timedelta(days=365)
    best: tuple[int, str] | None = None
    for row in rows:
        cd = _parse_calendar(row.get("calendar_date", ""))
        md = row.get("modis_date")
        if cd is None or not md:
            continue
        dist = abs((cd - target).days)
        if best is None or dist < best[0]:
            best = (dist, md)
    return best[1] if best else None


def fetch_ndvi_bundle(lat: float, lon: float) -> dict[str, Any]:
    """
    Returns ndvi_current, ndvi_historical, vegetation_source, optional modis composite ids.
    Falls back to deterministic synthetic on any failure.
    """
    today = datetime.now(timezone.utc).date()
    rows = _fetch_dates(lat, lon)
    if not rows:
        c, h = _synthetic_ndvi(lat, lon)
        return {
            "ndvi_current": c,
            "ndvi_historical": h,
            "vegetation_source": "synthetic",
            "ndvi_current_modis_date": None,
            "ndvi_historical_modis_date": None,
        }

    md_cur = _pick_current_date(rows, today)
    md_hist = _pick_yoy_date(rows, today)

    ndvi_c = ndvi_h = None
    if md_cur:
        ndvi_c = _ndvi_from_subset(_subset_json(lat, lon, md_cur))
    if md_hist:
        ndvi_h = _ndvi_from_subset(_subset_json(lat, lon, md_hist))

    synth_c, synth_h = _synthetic_ndvi(lat, lon)
    final_c = ndvi_c if ndvi_c is not None else synth_c
    final_h = ndvi_h if ndvi_h is not None else synth_h

    if ndvi_c is not None and ndvi_h is not None:
        src = "modis_mod13q1_ornl"
    elif ndvi_c is not None or ndvi_h is not None:
        src = "synthetic_partial"
    else:
        src = "synthetic"

    return {
        "ndvi_current": final_c,
        "ndvi_historical": final_h,
        "vegetation_source": src,
        "ndvi_current_modis_date": md_cur,
        "ndvi_historical_modis_date": md_hist,
    }
