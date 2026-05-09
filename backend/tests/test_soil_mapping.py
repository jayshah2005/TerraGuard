"""Unit tests for WRB → coarse soil mapping (no network)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.soil_grids import map_wrb_to_soil_type


def test_arenosols_sandy():
    assert map_wrb_to_soil_type("Arenosols (hypo)") == "Sandy"


def test_vertisols_clay():
    assert map_wrb_to_soil_type("Vertisols") == "Clay"


def test_unknown_defaults_loam():
    assert map_wrb_to_soil_type("SomethingUnknown") == "Loam"
