'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Leaf, Droplets, ThermometerSun, AlertTriangle, Info, MountainSnow, Sprout, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { AnalysisData, CropOutlookRow } from '../types/analysis';

const STRESS_LABELS: Record<string, string> = {
  heat_stress: 'Heat',
  cold_stress: 'Cold',
  water_deficit: 'Dry',
  water_excess: 'Wet',
  ndvi_decline: 'NDVI',
  soil_poor: 'Soil',
  forecast_heat_spike: 'Week heat',
  forecast_dry_spell: 'Dry spell',
};

function suitabilityBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-rose-500';
}

/** Visible fill width: score of 0 still shows a sliver so the bar is never "missing". */
function suitabilityBarWidthPercent(score: number): number {
  const s = Math.min(100, Math.max(0, score));
  if (s <= 0) return 8;
  return Math.max(s, 3);
}

function bandTextClass(band: string): string {
  if (band === 'Good') return 'text-emerald-700';
  if (band === 'Fair') return 'text-amber-700';
  return 'text-rose-700';
}

type SidebarTab = 'analysis' | 'outlook';

interface Props {
  data: AnalysisData | null;
  loading: boolean;
}

export default function InsightsPanel({ data, loading }: Props) {
  const [tab, setTab] = useState<SidebarTab>('analysis');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cropSearch, setCropSearch] = useState('');

  useEffect(() => {
    setExpandedId(null);
    setCropSearch('');
  }, [data?.region]);

  const filteredOutlook = useMemo(() => {
    const rows = data?.crop_outlook ?? [];
    const q = cropSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [data?.crop_outlook, cropSearch]);

  if (loading) {
    return (
      <div className="w-full h-full p-8 flex flex-col justify-center items-center text-gray-500 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        <p>Running AI Analysis Pipeline...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-full p-8 flex flex-col justify-center items-center text-gray-400 text-center">
        <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">No Region Selected</h2>
        <p>Click anywhere on the map to run the TerraGuard analysis pipeline for that location.</p>
      </div>
    );
  }

  const { features, risk_analysis, ai_insight, forecast, crop_type, forecast_stress_summary, crop_outlook } = data;

  let riskColorBg = 'bg-emerald-500';
  if (risk_analysis.level === 'Critical' || risk_analysis.level === 'High') {
    riskColorBg = 'bg-red-500';
  } else if (risk_analysis.level === 'Moderate') {
    riskColorBg = 'bg-amber-500';
  }

  const renderCropCards = (rows: CropOutlookRow[]) => (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">No crops match that search.</p>
      )}
      {rows.map((row: CropOutlookRow) => {
        const open = expandedId === row.id;
        const activeStress = Object.entries(row.stress || {}).filter(([, v]) => v);
        const barW = suitabilityBarWidthPercent(row.suitability_score);
        return (
          <div
            key={row.id}
            className={`rounded-lg border bg-white transition-shadow ${open ? 'ring-2 ring-emerald-500/80 border-emerald-200' : 'border-slate-200'}`}
          >
            <button
              type="button"
              onClick={() => setExpandedId(open ? null : row.id)}
              className="w-full text-left p-3 flex flex-col gap-2 hover:bg-slate-50/90 rounded-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {open ? <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" /> : <ChevronRight className="w-4 h-4 shrink-0 text-gray-500" />}
                  <span className="font-semibold text-gray-900 truncate">{row.label}</span>
                  <span className={`text-xs font-bold uppercase shrink-0 ${bandTextClass(row.band)}`}>{row.band}</span>
                </div>
                <span className="text-sm font-bold text-gray-800 tabular-nums">{row.suitability_score.toFixed(0)}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full min-w-[6px] rounded-full transition-all ${suitabilityBarColor(row.suitability_score)}`}
                  style={{ width: `${barW}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {activeStress.length === 0 && (
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Low stress flags</span>
                )}
                {activeStress.map(([key]) => (
                  <span
                    key={key}
                    className="text-[10px] uppercase font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"
                  >
                    {STRESS_LABELS[key] || key}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{row.deterministic_notes}</p>
            </button>
            {open && (
              <div className="px-3 pb-3 pt-0 text-sm border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                <p className="text-gray-700 mt-3">
                  <span className="font-semibold text-gray-900">Risks: </span>
                  {row.risks_text}
                </p>
                <p className="text-gray-700 mt-2">
                  <span className="font-semibold text-emerald-800">Mitigate: </span>
                  {row.mitigate_text}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Forecast windows: {row.forecast_heat_days} hot day(s) vs crop threshold; max {row.forecast_max_dry_streak} consecutive dry day(s) (crop-specific rain cutoff).
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto w-full bg-white text-gray-900 shadow-xl border-l flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-gray-800">Regional Analysis</h2>

      <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 gap-1">
        <button
          type="button"
          onClick={() => setTab('analysis')}
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-colors ${
            tab === 'analysis' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Analysis
        </button>
        <button
          type="button"
          onClick={() => setTab('outlook')}
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-colors ${
            tab === 'outlook' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Crop outlook
        </button>
      </div>

      {tab === 'analysis' && (
        <>
          <div className={`p-6 rounded-lg text-white relative ${riskColorBg}`}>
            <div className="flex items-center justify-between">
              <div className="relative group flex items-center gap-1 cursor-help">
                <span className="text-sm uppercase tracking-wider font-semibold opacity-90">Risk Score</span>
                <Info className="w-4 h-4 opacity-70" />
                <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  Heuristic failure risk for the highest suitability-ranked crop ({crop_type}) using the local rules engine—compare all crops under the Crop outlook tab.
                </div>
              </div>
            </div>
            <p className="text-xs opacity-90 mt-1 font-medium">Top-ranked match: {crop_type || '—'}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-4xl font-extrabold">{risk_analysis.score.toFixed(1)}%</span>
              <span className="text-xl font-medium">{risk_analysis.level}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg flex flex-col col-span-2">
              <div className="relative group flex items-center text-amber-700 mb-2 justify-between w-full cursor-help">
                <div className="flex items-center">
                  <MountainSnow className="w-4 h-4 mr-2" />
                  <span className="text-xs uppercase font-bold">Soil Substrate</span>
                </div>
                <Info className="w-4 h-4" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  Correlated with geographic latitude. Sandy soils heavily penalize arid environments; Clay soils resist drought but threaten waterlogging.
                </div>
              </div>
              <span className="text-xl font-semibold text-amber-900">{features.soil_type || 'Loam'} Baseline</span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg flex flex-col">
              <div className="flex items-center text-gray-500 mb-2">
                <ThermometerSun className="w-4 h-4 mr-2 text-rose-500" />
                <span className="text-xs uppercase font-bold">Temperature</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold text-gray-800">Avg {features.temp_avg_c.toFixed(1)}°C</span>
                <span className="text-xs text-gray-500 font-medium">
                  H: {features.temp_high_c.toFixed(1)}° · L: {features.temp_low_c.toFixed(1)}°
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg flex flex-col">
              <div className="relative group flex items-center text-gray-500 mb-2 justify-between w-full cursor-help">
                <div className="flex items-center">
                  <Droplets className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="text-xs uppercase font-bold">Rainfall</span>
                </div>
                <Info className="w-4 h-4" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  Displays today&apos;s local rainfall, followed by the rolling 30-day cumulative history.
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold text-gray-800">{features.rainfall_today_mm.toFixed(1)} mm</span>
                <span className="text-xs text-gray-500 font-medium">30-Day: {features.rainfall_30d_mm.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg flex flex-col col-span-2">
              <div className="relative group flex items-center text-emerald-700 mb-2 justify-between w-full cursor-help">
                <div className="flex items-center">
                  <Leaf className="w-4 h-4 mr-2" />
                  <span className="text-xs uppercase font-bold">Vegetation Health (NDVI)</span>
                </div>
                <Info className="w-4 h-4" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  Normalized Difference Vegetation Index: Ranges -1 to +1.
                  <br />
                  <br />
                  &lt; 0.2: Extreme stress/Barren.
                  <br />
                  &gt; 0.5: Healthy dense crops.
                </div>
              </div>
              <div className="flex justify-between items-center text-emerald-900 mt-1">
                <span className="text-xl font-semibold">{features.ndvi_current.toFixed(2)}</span>
                <span className="text-sm font-medium">Historical: {features.ndvi_historical.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center mb-3">
              <div className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold text-white tracking-wide">IBM watsonx.ai</div>
              <h3 className="ml-3 font-semibold text-gray-800">Regional crop fit</h3>
            </div>
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-blue-900 text-sm leading-relaxed shadow-inner">{ai_insight}</div>
          </div>

          {forecast && forecast.length > 0 && (
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="relative group flex items-center justify-between mb-4 cursor-help">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center">
                  7-Day Weather Forecast
                  <Info className="w-4 h-4 ml-2 text-gray-400" />
                </h3>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  Predicted daily High/Low temperatures and precipitation for the upcoming week.
                </div>
              </div>
              <div style={{ width: '100%', height: 250, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} width={30} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} width={30} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      formatter={(value, name) => {
                        const v = typeof value === 'number' ? value : Number(value);
                        if (name === 'temp_high_c') return [`${v.toFixed(1)}°C`, 'High Temp'];
                        if (name === 'temp_low_c') return [`${v.toFixed(1)}°C`, 'Low Temp'];
                        if (name === 'rainfall_mm') return [`${v.toFixed(1)}mm`, 'Rainfall'];
                        return [value as string | number, String(name)];
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      }}
                    />

                    <Bar yAxisId="right" name="rainfall_mm" dataKey="rainfall_mm" fill="#3b82f6" opacity={0.5} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" name="temp_high_c" dataKey="temp_high_c" stroke="#ef4444" strokeWidth={3} dot={false} />
                    <Line yAxisId="left" type="monotone" name="temp_low_c" dataKey="temp_low_c" stroke="#f59e0b" strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'outlook' && crop_outlook && crop_outlook.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 shadow-sm flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Crop outlook</h3>
            <div className="relative group ml-auto cursor-help">
              <Info className="w-4 h-4 text-gray-400" />
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                Suitability is deterministic from soil, climate, NDVI, and the 7-day forecast. Search filters the catalog; expand a row for risks and mitigations (watsonx for a subset, templates otherwise).
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={cropSearch}
              onChange={(e) => setCropSearch(e.target.value)}
              placeholder="Search crops…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="Search crops"
            />
          </div>

          {forecast_stress_summary && (
            <p className="text-xs text-gray-600 leading-relaxed">
              Next-week stress context: {forecast_stress_summary.cumulative_rain_mm} mm rain total; highs up to{' '}
              {forecast_stress_summary.max_high_c ?? '—'}°C; {forecast_stress_summary.days_high_ge_32c} day(s) ≥32°C; longest dry streak{' '}
              {forecast_stress_summary.max_consecutive_dry_days} day(s) under 2 mm.
            </p>
          )}

          <div className="overflow-y-auto flex-1 pr-1 -mr-1 max-h-[calc(100vh-220px)]">{renderCropCards(filteredOutlook)}</div>
        </div>
      )}

      {tab === 'outlook' && (!crop_outlook || crop_outlook.length === 0) && (
        <p className="text-sm text-gray-500">Run an analysis to load crop outlook.</p>
      )}
    </div>
  );
}
