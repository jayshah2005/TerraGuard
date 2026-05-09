'use client';

import { Flame, Droplets, ThermometerSun, AlertCircle } from 'lucide-react';
import type { ForecastDay, ForecastStressSummary } from '../types/analysis';

/** Aligns with backend `summarize_forecast_stress` heuristics. */
const HEAT_THRESHOLD_C = 32;
const DRY_DAY_MM = 2;

function dayOutlook(day: ForecastDay) {
  const high = Number(day.temp_high_c);
  const low = Number(day.temp_low_c);
  const rain = Number(day.rainfall_mm);
  const heatStress = high >= HEAT_THRESHOLD_C;
  const dryDay = rain < DRY_DAY_MM;
  const frostHint = low <= 2;
  let tone: 'calm' | 'watch' | 'stress' = 'calm';
  if (heatStress && dryDay) tone = 'stress';
  else if (heatStress || dryDay) tone = 'watch';
  return { heatStress, dryDay, frostHint, tone, high, low, rain };
}

function toneBorder(tone: 'calm' | 'watch' | 'stress'): string {
  if (tone === 'stress') return 'border-rose-200 bg-rose-50/80';
  if (tone === 'watch') return 'border-amber-200 bg-amber-50/60';
  return 'border-slate-200 bg-white';
}

interface Props {
  forecast: ForecastDay[];
  summary?: ForecastStressSummary;
}

/**
 * Replaces a generic temperature/rain chart with an agronomic short-range view:
 * week totals, heat/dry streak context, and per-day flags farmers care about.
 */
export default function ShortRangeFieldOutlook({ forecast, summary }: Props) {
  if (!forecast?.length) return null;

  const days = forecast.map((d) => ({ ...d, ...dayOutlook(d) }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/40">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Short-range field outlook</h3>
            <p className="text-xs text-slate-600 mt-1 leading-snug">
              Next {forecast.length} days after today — highlights <span className="font-semibold text-slate-700">heat stress</span> (high ≥
              {HEAT_THRESHOLD_C}°C) and <span className="font-semibold text-slate-700">dry days</span> (&lt;{DRY_DAY_MM} mm rain), the same rules
              used for regional stress stats.
            </p>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="rounded-lg bg-white/90 border border-slate-200 px-3 py-2 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                Week rain
              </p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{summary.cumulative_rain_mm} mm</p>
            </div>
            <div className="rounded-lg bg-white/90 border border-slate-200 px-3 py-2 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <ThermometerSun className="w-3 h-3 text-rose-500" />
                Hottest high
              </p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{summary.max_high_c ?? '—'}°C</p>
            </div>
            <div className="rounded-lg bg-white/90 border border-slate-200 px-3 py-2 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                Hot days
              </p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {summary.days_high_ge_32c} / {summary.days_count || forecast.length}
              </p>
              <p className="text-[10px] text-slate-500">≥{HEAT_THRESHOLD_C}°C</p>
            </div>
            <div className="rounded-lg bg-white/90 border border-slate-200 px-3 py-2 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                Max dry run
              </p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{summary.max_consecutive_dry_days} days</p>
              <p className="text-[10px] text-slate-500">&lt;{DRY_DAY_MM} mm/day</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 grid grid-cols-1 gap-2">
        {days.map((day) => {
          const maxRainBar = 25;
          const rainPct = Math.min(100, (day.rain / maxRainBar) * 100);
          return (
            <div
              key={day.day}
              className={`rounded-lg border px-3 py-2.5 transition-colors ${toneBorder(day.tone)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-bold text-slate-800 w-10 shrink-0">{day.day}</span>
                  <span className="text-sm text-slate-700 tabular-nums">
                    <span className="text-rose-600 font-semibold">{day.high.toFixed(0)}°</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-amber-700">{day.low.toFixed(0)}°</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {day.heatStress && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                      Heat
                    </span>
                  )}
                  {day.dryDay && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      Dry
                    </span>
                  )}
                  {day.frostHint && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      Frost risk
                    </span>
                  )}
                  {!day.heatStress && !day.dryDay && !day.frostHint && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Mild</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden min-w-0">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-blue-600 rounded-full transition-all"
                    style={{ width: `${rainPct}%` }}
                    title={`${day.rain.toFixed(1)} mm`}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums w-14 text-right shrink-0">{day.rain.toFixed(1)} mm</span>
              </div>
            </div>
          );
        })}
      </div>

      {summary?.min_low_c != null && summary.min_low_c <= 5 && (
        <p className="text-[11px] text-sky-800 bg-sky-50/80 px-4 py-2 border-t border-sky-100">
          Coldest night in this window: <span className="font-semibold">{summary.min_low_c}°C</span> — watch sensitive seedlings if planting soon.
        </p>
      )}
    </div>
  );
}
