"""Low-weight narrative hints (pests / seasonality) without proprietary APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Any


def static_agronomic_hints(lat: float, lon: float) -> dict[str, Any]:
    """Coarse rules for demo storytelling — not validated pest forecasts."""
    month = datetime.utcnow().month
    abs_lat = abs(lat)
    hints: list[str] = []

    if abs_lat >= 23.5:
        if month in (12, 1, 2):
            hints.append("cool_season_pathogens_possible")
        if month in (6, 7, 8):
            hints.append("warm_season_pest_pressure_typical")
    else:
        hints.append("tropical_year_round_pest_monitoring")

    if abs_lat < 35 and month in (3, 4, 5):
        hints.append("spring_planting_window_active_or_near")

    note = (
        "Static heuristic flags only — confirm with local extension services "
        "and scouting."
    )

    return {
        "pest_pressure_hints": hints,
        "planting_calendar_note": note,
        "agronomic_hints_source": "static_heuristic",
    }
