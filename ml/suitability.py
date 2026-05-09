"""
Deterministic crop suitability, forecast-derived stress, and template guidance.
Uses the same feature/forecast dicts produced by the API (seed-stable when RNG is seeded).
"""

from __future__ import annotations

from typing import Any, TypedDict


class StressFlags(TypedDict, total=False):
    heat_stress: bool
    cold_stress: bool
    water_deficit: bool
    water_excess: bool
    ndvi_decline: bool
    soil_poor: bool
    forecast_heat_spike: bool
    forecast_dry_spell: bool


def _band(score: float) -> str:
    if score >= 70:
        return "Good"
    if score >= 45:
        return "Fair"
    return "Poor"


def _planting_verdict(band: str, label: str) -> tuple[str, str]:
    """Headline + one-line rationale for demo (deterministic, no LLM)."""
    if band == "Good":
        return (
            "Favorable to plant",
            f"Modeled suitability for {label} is strong at this site for the mock climate/soil stack—still validate locally.",
        )
    if band == "Fair":
        return (
            "Marginal — plan management",
            f"{label} may work with irrigation, variety choice, or adjusted planting dates; monitor heat and moisture closely.",
        )
    return (
        "Not recommended to plant",
        f"Modeled fit for {label} is weak here unless major mitigations apply; consider alternatives or heavy intervention.",
    )


def summarize_forecast_stress(forecast: list[dict[str, Any]]) -> dict[str, Any]:
    """Region-level 7-day stats (no per-crop IBM calls)."""
    if not forecast:
        return {
            "days_count": 0,
            "cumulative_rain_mm": 0.0,
            "max_high_c": None,
            "min_low_c": None,
            "days_high_ge_32c": 0,
            "days_rain_lt_2mm": 0,
            "max_consecutive_dry_days": 0,
        }

    highs = [float(d.get("temp_high_c", 0)) for d in forecast]
    lows = [float(d.get("temp_low_c", 0)) for d in forecast]
    rains = [float(d.get("rainfall_mm", 0)) for d in forecast]

    cumulative = round(sum(rains), 1)
    max_high = round(max(highs), 1)
    min_low = round(min(lows), 1)
    days_hot = sum(1 for h in highs if h >= 32)
    days_dry = sum(1 for r in rains if r < 2.0)

    max_streak = 0
    streak = 0
    for r in rains:
        if r < 2.0:
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 0

    return {
        "days_count": len(forecast),
        "cumulative_rain_mm": cumulative,
        "max_high_c": max_high,
        "min_low_c": min_low,
        "days_high_ge_32c": days_hot,
        "days_rain_lt_2mm": days_dry,
        "max_consecutive_dry_days": max_streak,
    }


def _forecast_metrics_for_crop(
    forecast: list[dict[str, Any]], profile: dict[str, Any]
) -> tuple[int, int, int]:
    heat_thr = float(profile["forecast_heat_day_c"])
    dry_thr = float(profile["forecast_dry_day_mm"])
    heat_days = 0
    dry_days = 0
    max_dry_streak = 0
    streak = 0
    for day in forecast:
        th = float(day.get("temp_high_c", 0))
        rain = float(day.get("rainfall_mm", 0))
        if th >= heat_thr:
            heat_days += 1
        if rain < dry_thr:
            dry_days += 1
            streak += 1
            max_dry_streak = max(max_dry_streak, streak)
        else:
            streak = 0
    return heat_days, dry_days, max_dry_streak


def _build_stress(
    features: dict[str, Any],
    forecast: list[dict[str, Any]],
    profile: dict[str, Any],
    heat_days: int,
    max_dry_streak: int,
) -> StressFlags:
    soil = str(features.get("soil_type", ""))
    avg_t = float(features.get("temp_avg_c", 20))
    rain30 = float(features.get("rainfall_30d_mm", 0))
    ndvi_c = float(features.get("ndvi_current", 0.5))
    ndvi_h = float(features.get("ndvi_historical", 0.5))
    delta = ndvi_c - ndvi_h
    thr_delta = float(profile["ndvi_stress_threshold_delta"])

    avoid = set(profile.get("avoid_soils") or [])
    heat_lim = float(profile["heat_stress_temp_c"])
    cold_lim = float(profile["cold_stress_temp_c"])
    min_r = float(profile["rainfall_30d_min_mm"])
    severe = float(profile["drought_severe_mm"])
    flood = float(profile["waterlogging_rain_mm"])

    stress: StressFlags = {}
    stress["heat_stress"] = avg_t >= heat_lim or heat_days >= 3
    stress["cold_stress"] = avg_t <= cold_lim
    stress["water_deficit"] = rain30 < min_r or rain30 < severe or max_dry_streak >= 4
    stress["water_excess"] = rain30 > flood
    stress["ndvi_decline"] = delta < thr_delta
    stress["soil_poor"] = soil in avoid
    stress["forecast_heat_spike"] = heat_days >= 2
    stress["forecast_dry_spell"] = max_dry_streak >= 3
    return stress


def _temp_penalty(avg_t: float, profile: dict[str, Any]) -> float:
    lo = float(profile["temp_optimal_min_c"])
    hi = float(profile["temp_optimal_max_c"])
    if lo <= avg_t <= hi:
        return 0.0
    if avg_t < lo:
        return min(35.0, (lo - avg_t) * 2.5)
    return min(35.0, (avg_t - hi) * 2.2)


def _water_penalty(rain30: float, profile: dict[str, Any]) -> float:
    ideal_lo = float(profile["rainfall_30d_ideal_min_mm"])
    ideal_hi = float(profile["rainfall_30d_ideal_max_mm"])
    min_r = float(profile["rainfall_30d_min_mm"])
    severe = float(profile["drought_severe_mm"])
    flood = float(profile["waterlogging_rain_mm"])

    if rain30 < severe:
        return 40.0
    if rain30 < min_r:
        return 28.0
    if rain30 < ideal_lo:
        return 12.0 + (ideal_lo - rain30) * 0.15
    if rain30 > flood:
        return 22.0
    if rain30 > ideal_hi:
        return 8.0 + (rain30 - ideal_hi) * 0.05
    return 0.0


def _soil_adjustment(soil: str, profile: dict[str, Any]) -> float:
    """Positive = penalty points."""
    if soil in set(profile.get("avoid_soils") or []):
        return 18.0
    if soil in set(profile.get("preferred_soils") or []):
        return -5.0
    return 0.0


def _ndvi_penalty(delta: float, profile: dict[str, Any]) -> float:
    thr = float(profile["ndvi_stress_threshold_delta"])
    if delta < thr:
        return min(25.0, abs(delta - thr) * 120.0)
    return 0.0


def _forecast_penalty(heat_days: int, max_dry_streak: int) -> float:
    pen = 0.0
    if heat_days >= 2:
        pen += (heat_days - 1) * 4.0
    if max_dry_streak >= 3:
        pen += (max_dry_streak - 2) * 5.0
    return min(30.0, pen)


def _deterministic_note(stress: StressFlags) -> str:
    parts: list[str] = []
    if stress.get("water_deficit"):
        parts.append("Moisture stress likely")
    if stress.get("water_excess"):
        parts.append("Excess wet conditions")
    if stress.get("heat_stress") or stress.get("forecast_heat_spike"):
        parts.append("Heat pressure")
    if stress.get("cold_stress"):
        parts.append("Cold exposure")
    if stress.get("ndvi_decline"):
        parts.append("Vegetation decline vs history")
    if stress.get("soil_poor"):
        parts.append("Soil mismatch for this crop")
    if not parts:
        return "Conditions broadly align with this crop profile."
    return "; ".join(parts) + "."


def fallback_guidance(
    crop_label: str, stress: StressFlags, features: dict[str, Any]
) -> tuple[str, str]:
    """Template risks/mitigations when watsonx is offline or parse fails."""
    soil = features.get("soil_type", "Unknown")
    rain = float(features.get("rainfall_30d_mm", 0))
    avg_t = float(features.get("temp_avg_c", 0))

    risk_bits: list[str] = []
    mit_bits: list[str] = []

    if stress.get("water_deficit"):
        risk_bits.append(f"Limited rainfall ({rain:.0f} mm / 30d) risks establishment and yield.")
        mit_bits.append("Prioritize soil moisture monitoring, mulching, and efficient irrigation scheduling.")
    if stress.get("water_excess"):
        risk_bits.append("High cumulative moisture may increase disease and waterlogging risk.")
        mit_bits.append("Improve drainage, avoid over-irrigation, and scout for root/stem diseases early.")
    if stress.get("heat_stress") or stress.get("forecast_heat_spike"):
        risk_bits.append(f"Temperature stress (avg ~{avg_t:.1f}°C) may limit pollination and grain fill.")
        mit_bits.append("Shift sensitive operations to cooler hours; consider shade or heat-tolerant cultivars.")
    if stress.get("cold_stress"):
        risk_bits.append("Cold conditions may slow growth or damage sensitive growth stages.")
        mit_bits.append("Adjust planting dates and use frost protection or cold-tolerant varieties where available.")
    if stress.get("ndvi_decline"):
        risk_bits.append("NDVI has slipped versus historical baseline, suggesting emerging field stress.")
        mit_bits.append("Ground-truth with scouting; verify nutrition, pests, and water uniformity.")
    if stress.get("soil_poor"):
        risk_bits.append(f"{soil} soil is a weak match for {crop_label} in this mock profile.")
        mit_bits.append("Amend organic matter, correct pH, or select a better-matched rotation crop.")

    if not risk_bits:
        risk_bits.append(
            f"Relative to catalog thresholds, {crop_label} faces moderate ambient constraints at this location."
        )
    if not mit_bits:
        mit_bits.append("Maintain routine scouting and align inputs with local extension guidance.")

    return " ".join(risk_bits), " ".join(mit_bits)


def _outlook_row_for_profile(
    features: dict[str, Any],
    forecast: list[dict[str, Any]],
    profile: dict[str, Any],
) -> dict[str, Any]:
    soil = str(features.get("soil_type", ""))
    avg_t = float(features.get("temp_avg_c", 20))
    rain30 = float(features.get("rainfall_30d_mm", 0))
    ndvi_c = float(features.get("ndvi_current", 0.5))
    ndvi_h = float(features.get("ndvi_historical", 0.5))
    delta = ndvi_c - ndvi_h

    heat_days, _dry_days, max_dry_streak = _forecast_metrics_for_crop(forecast, profile)
    stress = _build_stress(features, forecast, profile, heat_days, max_dry_streak)

    pen = (
        _temp_penalty(avg_t, profile)
        + _water_penalty(rain30, profile)
        + _soil_adjustment(soil, profile)
        + _ndvi_penalty(delta, profile)
        + _forecast_penalty(heat_days, max_dry_streak)
    )
    score = max(0.0, min(100.0, 100.0 - pen))
    note = _deterministic_note(stress)
    risks, mit = fallback_guidance(profile["label"], stress, features)
    band = _band(score)
    verdict, rationale = _planting_verdict(band, profile["label"])
    heat_thr = round(float(profile["forecast_heat_day_c"]), 1)
    dry_thr = round(float(profile["forecast_dry_day_mm"]), 2)

    return {
        "id": profile["id"],
        "label": profile["label"],
        "suitability_score": round(score, 1),
        "band": band,
        "planting_verdict": verdict,
        "planting_rationale": rationale,
        "stress": dict(stress),
        "deterministic_notes": note,
        "forecast_heat_days": heat_days,
        "forecast_max_dry_streak": max_dry_streak,
        "forecast_heat_threshold_c": heat_thr,
        "forecast_dry_rain_mm_per_day": dry_thr,
        "risks_text": risks,
        "mitigate_text": mit,
    }


def compute_single_crop_outlook(
    features: dict[str, Any],
    forecast: list[dict[str, Any]],
    profile: dict[str, Any],
) -> dict[str, Any]:
    """One catalog crop: deterministic suitability + template guidance (watsonx merged in API)."""
    return _outlook_row_for_profile(features, forecast, profile)


