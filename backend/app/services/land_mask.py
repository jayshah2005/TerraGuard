"""
Global land polygon gate using Natural Earth **50m** land GeoJSON (WGS84).

110m land omits many small islands; 50m restores them for map clicks. For even
smaller features, set TERRAGUARD_LAND_MASK_GEOJSON to Natural Earth `ne_10m_land.geojson`.

No HTTP on the click path — deterministic point-in-polygon via Shapely STRtree.
If the GeoJSON fails to load, map_click_preflight fails closed (blocks analysis).
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from shapely.geometry import Point, shape
from shapely.strtree import STRtree

logger = logging.getLogger(__name__)

# Natural Earth 50m includes far more small islands than 110m (110m generalizes many away).
# For micro-islands, point TERRAGUARD_LAND_MASK_GEOJSON at ne_10m_land.geojson (~10 MB).
_DEFAULT_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "geo" / "ne_50m_land.geojson"

_polygons: list | None = None
_tree: STRtree | None = None
_load_error: str | None = None


def _flatten_to_polygons(geom) -> list:
    if geom.is_empty:
        return []
    if geom.geom_type == "Polygon":
        return [geom]
    if geom.geom_type == "MultiPolygon":
        return list(geom.geoms)
    return []


def _load() -> None:
    global _polygons, _tree, _load_error
    if _polygons is not None:
        return

    path = os.environ.get("TERRAGUARD_LAND_MASK_GEOJSON")
    geo_path = Path(path) if path else _DEFAULT_PATH

    try:
        raw = geo_path.read_text(encoding="utf-8")
        data = json.loads(raw)
    except Exception as e:
        _load_error = str(e)
        _polygons = []
        _tree = None
        logger.error("Land mask read failed (%s): %s", geo_path, e)
        return

    polys: list = []
    for feat in data.get("features") or []:
        gjson = feat.get("geometry")
        if not gjson:
            continue
        try:
            g = shape(gjson)
        except Exception:
            continue
        polys.extend(_flatten_to_polygons(g))

    _load_error = None
    _polygons = polys
    _tree = STRtree(polys) if polys else None
    if not polys:
        _load_error = f"No polygon geometries parsed from {geo_path}"


def point_on_land(lat: float, lon: float) -> bool:
    """True iff (lon,lat) is covered by a Natural Earth land polygon. Requires successful mask load."""
    _load()
    if not _polygons or _tree is None:
        return False
    pt = Point(float(lon), float(lat))
    try:
        indices = _tree.query(pt, predicate="intersects")
    except Exception as e:
        logger.warning("STRtree query failed, falling back to linear scan: %s", e)
        for poly in _polygons:
            if poly.covers(pt):
                return True
        return False

    for i in indices:
        if _polygons[int(i)].covers(pt):
            return True
    return False


def mask_ready() -> bool:
    _load()
    return bool(_polygons) and _tree is not None


def mask_load_error() -> str | None:
    _load()
    return _load_error


def map_click_preflight(lat: float, lon: float) -> dict[str, Any]:
    """
    Lightweight gate before POST /analyze.
    """
    _load()
    if not mask_ready():
        return {
            "allow_analysis": False,
            "reason": "mask_unavailable",
            "message": (
                "Land boundaries could not be loaded, so we cannot verify this pin is on dry land. "
                "Ensure backend/data/geo/ne_50m_land.geojson is present or set TERRAGUARD_LAND_MASK_GEOJSON."
            ),
            "detail": mask_load_error(),
        }

    if point_on_land(lat, lon):
        return {
            "allow_analysis": True,
            "reason": None,
            "message": None,
            "detail": None,
        }

    return {
        "allow_analysis": False,
        "reason": "not_on_land",
        "message": (
            "This point is not on mapped land (ocean or similar). Click dry land to run regional analysis."
        ),
        "detail": None,
    }
