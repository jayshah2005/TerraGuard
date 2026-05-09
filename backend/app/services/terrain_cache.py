"""Disk cache for terrain (elevation / slope) lookups."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Any

TERRAIN_TTL_DAYS = 7

_cache_dir: str | None = None


def _cache_root() -> str:
    global _cache_dir
    if _cache_dir is None:
        base = os.path.dirname(__file__)
        _cache_dir = os.path.normpath(os.path.join(base, "..", "..", "data", "terrain_cache"))
    return _cache_dir


def _ensure_dir() -> None:
    os.makedirs(_cache_root(), exist_ok=True)


def cache_key(lat: float, lon: float) -> str:
    return hashlib.md5(f"{lat:.4f},{lon:.4f}".encode()).hexdigest()


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
    fetched = data.get("fetched_at_utc")
    if not fetched:
        return None
    try:
        ft = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
    except ValueError:
        return None
    if ft.tzinfo is None:
        ft = ft.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - ft > timedelta(days=TERRAIN_TTL_DAYS):
        return None
    return data


def write_payload(lat: float, lon: float, payload: dict[str, Any]) -> None:
    _ensure_dir()
    out = {**payload, "fetched_at_utc": datetime.now(timezone.utc).isoformat()}
    path = cache_path(lat, lon)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f)
    os.replace(tmp, path)
