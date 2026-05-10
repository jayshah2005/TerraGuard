"""
Deterministic Plant outlook preselection: rank catalog entries by suitability and pick a diverse subset.
"""

from __future__ import annotations

from typing import Any

from ml.suitability import compute_single_crop_outlook

from app.services.crop_catalog import get_profiles_as_dicts

# Staple field crops used for diversity (ids must exist in crops.json)
FIELD_STAPLE_IDS = frozenset(
    {
        "maize",
        "wheat",
        "rice",
        "sorghum",
        "soybeans",
        "dry_beans",
    }
)

DEFAULT_LIMIT = 5


def _bucket(crop_id: str) -> str | None:
    cid = crop_id.lower()
    if cid.startswith("flower_"):
        return "flower"
    if cid.startswith("herb_") or cid.startswith("garden_"):
        return "herb_garden"
    if cid in FIELD_STAPLE_IDS:
        return "field"
    return None


def build_suggested_crop_outlook(
    features: dict[str, Any],
    forecast: list[dict[str, Any]],
    *,
    limit: int = DEFAULT_LIMIT,
) -> list[dict[str, Any]]:
    """
    Full outlook rows for initial-analyze suggestions (same shape as compute_single_crop_outlook).
    Picks best-scoring candidate per diversity bucket (flower, herb/garden, field staple), then fills by score.
    """
    profiles = get_profiles_as_dicts()
    scored: list[tuple[float, dict[str, Any]]] = []
    for profile in profiles:
        row = compute_single_crop_outlook(features, forecast, profile)
        scored.append((float(row["suitability_score"]), row))

    scored.sort(key=lambda x: -x[0])

    picked: list[dict[str, Any]] = []
    seen: set[str] = set()

    for bucket_name in ("flower", "herb_garden", "field"):
        for score, row in scored:
            pid = str(row["id"]).lower()
            if pid in seen:
                continue
            if _bucket(str(row["id"])) == bucket_name:
                picked.append(row)
                seen.add(pid)
                break

    for score, row in scored:
        if len(picked) >= limit:
            break
        pid = str(row["id"]).lower()
        if pid in seen:
            continue
        picked.append(row)
        seen.add(pid)

    return picked[:limit]
