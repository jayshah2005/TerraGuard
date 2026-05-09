"""Growing degree days from Open-Meteo archive rows (daily min/max)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from app.services.weather import _parse_hist_date

DEFAULT_GDD_BASE_C = 10.0


def gdd_accum_season_cd(historical: list[dict[str, Any]], base_c: float = DEFAULT_GDD_BASE_C) -> float:
    """GDD from Jan 1 (local calendar rows) through yesterday using mean daily temperature."""
    cutoff = datetime.utcnow().date() - timedelta(days=1)
    year = cutoff.year
    start = date(year, 1, 1)
    total = 0.0
    for row in historical:
        d = _parse_hist_date(row)
        if d is None or d < start or d > cutoff:
            continue
        tmax = float(row.get("temperature_max", 0) or 0)
        tmin = float(row.get("temperature_min", 0) or 0)
        tmean = (tmax + tmin) / 2.0
        total += max(0.0, tmean - base_c)
    return round(total, 1)


def gdd_last_30d_cd(historical: list[dict[str, Any]], base_c: float = DEFAULT_GDD_BASE_C) -> float | None:
    """GDD sum over the same trailing window as rainfall_30d (complete UTC days through yesterday)."""
    today_utc = datetime.utcnow().date()
    cutoff = today_utc - timedelta(days=1)

    dated: list[tuple[date, dict[str, Any]]] = []
    for row in historical:
        d = _parse_hist_date(row)
        if d is None or d > cutoff:
            continue
        dated.append((d, row))

    dated.sort(key=lambda x: x[0])
    chunk = dated[-30:] if len(dated) >= 30 else dated
    if not chunk:
        return None
    total = 0.0
    for _, row in chunk:
        tmax = float(row.get("temperature_max", 0) or 0)
        tmin = float(row.get("temperature_min", 0) or 0)
        tmean = (tmax + tmin) / 2.0
        total += max(0.0, tmean - base_c)
    return round(total, 1)


def build_gdd_features(historical: list[dict[str, Any]], base_c: float = DEFAULT_GDD_BASE_C) -> dict[str, Any]:
    return {
        "gdd_base_temp_c": base_c,
        "gdd_accum_season_cd": gdd_accum_season_cd(historical, base_c),
        "gdd_30d_cd": gdd_last_30d_cd(historical, base_c),
        "gdd_source": "open_meteo_archive",
    }
