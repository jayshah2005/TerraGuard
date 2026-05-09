"""Disk JSON cache for SoilGrids classification responses."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Any

SOIL_TTL_DAYS = 7

_cache_dir: str | None = None


def _cache_root() -> str:
    global _cache_dir
    if _cache_dir is None:
        base = os.path.dirname(__file__)
        _cache_dir = os.path.normpath(os.path.join(base, "..", "..", "data", "soil_cache"))
    return _cache_dir


def _ensure_dir() -> None:
    os.makedirs(_cache_root(), exist_ok=True)


def cache_key(lat: float, lon: float) -> str:
    raw = f"{lat:.4f},{lon:.4f}"
    return hashlib.md5(raw.encode()).hexdigest()


def cache_path(lat: float, lon: float) -> str:
    return os.path.join(_cache_root(), f"{cache_key(lat, lon)}.json")


def read_valid(lat: float, lon: float) -> dict[str, Any] | None:
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
    if age > timedelta(days=SOIL_TTL_DAYS):
        return None
    return data


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def write_payload(lat: float, lon: float, payload: dict[str, Any]) -> None:
    _ensure_dir()
    out = {**payload, "fetched_at_utc": datetime.now(timezone.utc).isoformat()}
    path = cache_path(lat, lon)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f)
    os.replace(tmp, path)
