"""
Disk JSON cache for Open-Meteo historical + forecast payloads.
Key includes rounded lat/lon and UTC date; entries expire after FORECAST_TTL_HOURS.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Any

FORECAST_TTL_HOURS = 3

_cache_dir: str | None = None


def _cache_root() -> str:
    global _cache_dir
    if _cache_dir is None:
        base = os.path.dirname(__file__)
        _cache_dir = os.path.normpath(os.path.join(base, "..", "..", "data", "weather_cache"))
    return _cache_dir


def _ensure_dir() -> None:
    os.makedirs(_cache_root(), exist_ok=True)


def cache_key(lat: float, lon: float) -> str:
    utc_day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    raw = f"{lat:.4f},{lon:.4f}|{utc_day}"
    return hashlib.md5(raw.encode()).hexdigest()


def cache_path(lat: float, lon: float) -> str:
    return os.path.join(_cache_root(), f"{cache_key(lat, lon)}.json")


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def read_valid(lat: float, lon: float) -> dict[str, Any] | None:
    """Return cached payload if file exists and age < FORECAST_TTL_HOURS."""
    path = cache_path(lat, lon)
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
    age = datetime.now(timezone.utc) - fetched
    if age > timedelta(hours=FORECAST_TTL_HOURS):
        return None
    return data


def write_payload(lat: float, lon: float, historical: list, forecast_daily: list) -> None:
    _ensure_dir()
    payload = {
        "historical": historical,
        "forecast_daily": forecast_daily,
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "source": "open-meteo",
    }
    path = cache_path(lat, lon)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    os.replace(tmp, path)
