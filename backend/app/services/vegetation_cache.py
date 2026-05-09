"""Disk cache for MODIS NDVI subset payloads (longer TTL than weather)."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Any

VEGETATION_TTL_HOURS = 72

_cache_dir: str | None = None


def _cache_root() -> str:
    global _cache_dir
    if _cache_dir is None:
        base = os.path.dirname(__file__)
        _cache_dir = os.path.normpath(os.path.join(base, "..", "..", "data", "vegetation_cache"))
    return _cache_dir


def _ensure_dir() -> None:
    os.makedirs(_cache_root(), exist_ok=True)


def subset_cache_key(lat: float, lon: float, modis_date: str) -> str:
    raw = f"{lat:.4f},{lon:.4f}|{modis_date}"
    return hashlib.md5(raw.encode()).hexdigest()


def subset_cache_path(lat: float, lon: float, modis_date: str) -> str:
    return os.path.join(_cache_root(), f"mod13_{subset_cache_key(lat, lon, modis_date)}.json")


def read_subset(lat: float, lon: float, modis_date: str) -> dict[str, Any] | None:
    path = subset_cache_path(lat, lon, modis_date)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    fetched = _parse_iso(data.get("fetched_at_utc"))
    if not fetched:
        return None
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - fetched > timedelta(hours=VEGETATION_TTL_HOURS):
        return None
    return data.get("subset_json")


def write_subset(lat: float, lon: float, modis_date: str, subset_json: dict[str, Any]) -> None:
    _ensure_dir()
    path = subset_cache_path(lat, lon, modis_date)
    payload = {
        "subset_json": subset_json,
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    os.replace(tmp, path)


def dates_cache_path(lat: float, lon: float) -> str:
    raw = f"dates|{lat:.4f},{lon:.4f}"
    h = hashlib.md5(raw.encode()).hexdigest()
    return os.path.join(_cache_root(), f"mod13_dates_{h}.json")


def read_dates(lat: float, lon: float) -> list[dict[str, str]] | None:
    path = dates_cache_path(lat, lon)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    fetched = _parse_iso(data.get("fetched_at_utc"))
    if not fetched:
        return None
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - fetched > timedelta(hours=VEGETATION_TTL_HOURS):
        return None
    return data.get("dates")


def write_dates(lat: float, lon: float, dates: list[dict[str, str]]) -> None:
    _ensure_dir()
    path = dates_cache_path(lat, lon)
    payload = {"dates": dates, "fetched_at_utc": datetime.now(timezone.utc).isoformat()}
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    os.replace(tmp, path)


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None
