'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Leaf, Droplets, ThermometerSun, AlertTriangle, Info, MountainSnow, Sprout, ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { AnalysisData, CropOutlookRow, CropCatalogItem } from '../types/analysis';

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

function verdictBannerClass(band: string): string {
  if (band === 'Good') return 'bg-emerald-100 border-emerald-200 text-emerald-950';
  if (band === 'Fair') return 'bg-amber-100 border-amber-200 text-amber-950';
  return 'bg-rose-100 border-rose-200 text-rose-950';
}

type SidebarTab = 'analysis' | 'outlook';

interface Props {
  data: AnalysisData | null;
  stackedCropOutlook: CropOutlookRow[];
  loading: boolean;
  loadingCrop: boolean;
  onSelectCrop: (cropId: string) => void;
  onClearAllCrops: () => void;
}

export default function InsightsPanel({ data, stackedCropOutlook, loading, loadingCrop, onSelectCrop, onClearAllCrops }: Props) {
  const [tab, setTab] = useState<SidebarTab>('analysis');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cropSearch, setCropSearch] = useState('');
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([]);

  useEffect(() => {
    setExpandedId(null);
    setCropSearch('');
  }, [data?.region]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    fetch(`${backendUrl}/api/v1/crops`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load crop catalog');
        return r.json();
      })
      .then((rows: CropCatalogItem[]) => {
        if (!cancelled) setCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [data?.region]);

  const filteredCatalog = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return catalog
      .filter((c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 50);
  }, [catalog, cropSearch]);

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

  const { features, risk_analysis, ai_insight, forecast, crop_type, forecast_stress_summary } = data;
  const hasCropFocus = stackedCropOutlook.length > 0;

  let riskColorBg = 'bg-emerald-500';
  if (risk_analysis.level === 'Critical' || risk_analysis.level === 'High') {
    riskColorBg = 'bg-red-500';
  } else if (risk_analysis.level === 'Moderate') {
    riskColorBg = 'bg-amber-500';
  }

  const renderCropCards = (rows: CropOutlookRow[]) => (
    <div className="space-y-3">
      {rows.map((row: CropOutlookRow) => {
        const open = expandedId === row.id;
        const activeStress = Object.entries(row.stress || {}).filter(([, v]) => v);
        const barW = suitabilityBarWidthPercent(row.suitability_score);
        const heatThr = row.forecast_heat_threshold_c ?? 0;
        const dryThr = row.forecast_dry_rain_mm_per_day ?? 0;
        const fcDays = forecast?.length ?? 7;
        return (
          <div
            key={row.id}
            className={`rounded-lg border bg-white transition-shadow ${open ? 'ring-2 ring-emerald-500/80 border-emerald-200' : 'border-slate-200'}`}
          >
            <div className={`mx-3 mt-3 rounded-lg border px-3 py-2 text-sm ${verdictBannerClass(row.band)}`}>
              <p className="font-bold leading-tight">{row.planting_verdict ?? '—'}</p>
              <p className="text-xs mt-1 opacity-90 leading-snug">{row.planting_rationale ?? ''}</p>
            </div>
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
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Suitability</span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {row.suitability_score.toFixed(0)} / 100
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full min-w-[6px] rounded-full transition-all ${suitabilityBarColor(row.suitability_score)}`}
                    style={{ width: `${barW}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Higher = better match for this site (not a “risk” meter).</p>
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
                <div className="mt-3 text-xs text-gray-600 leading-relaxed border-t border-slate-200 pt-2">
                  <p className="font-semibold text-gray-800 mb-1">Next 7 days vs this crop&apos;s thresholds</p>
                  <p>
                    <span className="font-medium text-gray-700">{row.forecast_heat_days}</span> of <span className="font-medium">{fcDays}</span> forecast days have
                    daily high ≥ <span className="font-medium">{heatThr}°C</span> (this crop&apos;s heat-stress cutoff for the short-range outlook).
                  </p>
                  <p className="mt-1">
                    Longest run of days with rain below <span className="font-medium">{dryThr} mm</span>/day:{' '}
                    <span className="font-medium">{row.forecast_max_dry_streak}</span> day(s) (crop-specific &quot;very dry&quot; day threshold).
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const showSearchResults = cropSearch.trim().length >= 2 && !loadingCrop;

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
                  {hasCropFocus
                    ? `Heuristic failure risk for ${crop_type} (most recently loaded crop) using the local rules engine.`
                    : 'Placeholder risk using Maize as a baseline until you load a crop under Crop outlook (then this updates to the latest crop you add).'}
                </div>
              </div>
            </div>
            <p className="text-xs opacity-90 mt-1 font-medium">
              {hasCropFocus ? `Latest crop loaded: ${crop_type}` : `Baseline crop: ${crop_type} (load a crop for a tailored score)`}
            </p>
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
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-blue-900 text-sm leading-relaxed shadow-inner">
              {ai_insight ?? '—'}
            </div>
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

      {tab === 'outlook' && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 shadow-sm flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Crop outlook</h3>
            <div className="relative group ml-auto cursor-help">
              <Info className="w-4 h-4 text-gray-400" />
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                Search the catalog. Each selection loads suitability + one IBM watsonx guidance pass. Multiple crops stay on screen for comparison.
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {hasCropFocus
              ? `Comparing ${stackedCropOutlook.length} crop(s). Search below to add or replace by re-selecting the same crop.`
              : `Type at least two letters to search. Pick a crop to load suitability, stress flags, and guidance.`}
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={cropSearch}
              onChange={(e) => setCropSearch(e.target.value)}
              placeholder="Search crops (e.g. wheat, tomato)…"
              disabled={loadingCrop}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
              aria-label="Search crops"
            />
          </div>

          {loadingCrop && (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              Loading crop outlook…
            </div>
          )}

          {hasCropFocus && !loadingCrop && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onClearAllCrops()}
                className="text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200"
              >
                Clear all comparisons
              </button>
            </div>
          )}

          {forecast_stress_summary && (
            <p className="text-xs text-gray-600 leading-relaxed">
              Next-week stress context: {forecast_stress_summary.cumulative_rain_mm} mm rain total; highs up to{' '}
              {forecast_stress_summary.max_high_c ?? '—'}°C; {forecast_stress_summary.days_high_ge_32c} day(s) ≥32°C; longest dry streak{' '}
              {forecast_stress_summary.max_consecutive_dry_days} day(s) under 2 mm.
            </p>
          )}

          {hasCropFocus && (
            <div className="overflow-y-auto flex-1 pr-1 -mr-1 max-h-[min(48vh,420px)] border-b border-slate-200 pb-3">
              {renderCropCards(stackedCropOutlook)}
            </div>
          )}

          {!showSearchResults && !hasCropFocus && (
            <p className="text-xs text-gray-500 py-4 text-center">Enter at least 2 characters to search the catalog.</p>
          )}

          {showSearchResults && (
            <div>
              {hasCropFocus && <p className="text-xs font-semibold text-gray-700 mb-2">Add another crop</p>}
              <ul className="overflow-y-auto max-h-[min(40vh,360px)] space-y-1 border border-slate-200 rounded-lg bg-white p-2">
                {filteredCatalog.length === 0 && <li className="text-sm text-gray-500 px-2 py-3 text-center">No matching crops.</li>}
                {filteredCatalog.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCrop(c.id)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-800 hover:bg-emerald-50 border border-transparent hover:border-emerald-100"
                    >
                      <span className="font-medium">{c.label}</span>
                      <span className="text-xs text-gray-400 ml-2 font-mono">{c.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
