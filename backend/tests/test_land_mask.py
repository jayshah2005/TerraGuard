"""Natural Earth land-mask gate: local GeoJSON, no network."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import land_mask as lm


def test_mask_bundle_loads():
    lm._load()
    assert lm.mask_ready()
    assert lm.mask_load_error() is None


def test_indian_ocean_off_tanzania_blocked():
    """Open ocean east of Dar es Salaam — not on mapped land."""
    assert lm.point_on_land(-6.5, 39.5) is False
    out = lm.map_click_preflight(-6.5, 39.5)
    assert out["allow_analysis"] is False
    assert out["reason"] == "not_on_land"
    assert out["message"]


def test_nairobi_on_land_allowed():
    assert lm.point_on_land(-1.29, 36.82) is True
    out = lm.map_click_preflight(-1.29, 36.82)
    assert out["allow_analysis"] is True
    assert out["reason"] is None


def test_small_island_nauru_allowed():
    """Natural Earth 50m keeps tiny islands that 110m drops — pins should count as land."""
    assert lm.point_on_land(-0.53, 166.92) is True
    out = lm.map_click_preflight(-0.53, 166.92)
    assert out["allow_analysis"] is True


def test_mask_unavailable_fail_closed(tmp_path, monkeypatch):
    """Missing GeoJSON → block analysis (fail closed)."""
    bad = tmp_path / "missing.geojson"
    monkeypatch.setenv("GROWSPOT_LAND_MASK_GEOJSON", str(bad))
    import importlib

    importlib.reload(lm)
    try:
        out = lm.map_click_preflight(0.0, 0.0)
        assert out["allow_analysis"] is False
        assert out["reason"] == "mask_unavailable"
    finally:
        monkeypatch.delenv("GROWSPOT_LAND_MASK_GEOJSON", raising=False)
        importlib.reload(lm)
