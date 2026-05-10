'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Leaf, Droplets, ThermometerSun, AlertTriangle, Info, MountainSnow, Sprout, ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react';
import type { AnalysisData, CropOutlookRow, CropCatalogItem } from '../types/analysis';
import RegionalSignalsAudit from './RegionalSignalsAudit';
import ShortRangeFieldOutlook from './ShortRangeFieldOutlook';

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
  /** When set, a plant outlook request is in flight for this catalog id */
  loadingCropId: string | null;
  onCropSelectionChange: (cropId: string, selected: boolean) => void | Promise<void>;
  /** Map preflight blocked analysis (off mapped land or mask error); full pipeline was not run */
  locationPreflightBlock?: { message: string; reason?: string } | null;
}

const PLANT_OUTLOOK_HELP =
  'Search the catalog for vegetables, herbs, flowers, or field crops. Tick plants to load suitability for home gardens or farms. Untick to remove. Several plants can be compared at once. Scores use your regional signals and short-range outlook on the Analysis tab.';

export default function InsightsPanel({
  data,
  stackedCropOutlook,
  loading,
  loadingCropId,
  onCropSelectionChange,
  locationPreflightBlock = null,
}: Props) {
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
        if (!r.ok) throw new Error('Failed to load plant catalog');
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

  const selectedIdSet = useMemo(
    () => new Set(stackedCropOutlook.map((r) => r.id.toLowerCase())),
    [stackedCropOutlook]
  );

  const isCropSelected = (catalogId: string) => selectedIdSet.has(catalogId.toLowerCase());

  const loadingCropLabel = useMemo(() => {
    if (!loadingCropId) return '';
    const hit = catalog.find((c) => c.id.toLowerCase() === loadingCropId.toLowerCase());
    return hit?.label ?? loadingCropId;
  }, [loadingCropId, catalog]);

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="flex-1 flex flex-col justify-center items-center text-gray-500 space-y-4 p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          <p>Checking location and running analysis…</p>
        </div>
      </div>
    );
  }

  if (locationPreflightBlock?.message) {
    const maskErr = locationPreflightBlock.reason === 'mask_unavailable';
    const reqFail = locationPreflightBlock.reason === 'request_failed';
    const title = maskErr ? 'Cannot verify land' : reqFail ? 'Land check failed' : 'Not on mapped land';
    const hint = maskErr
      ? 'Fix the deployment land-mask file or try again. We block analysis until we can confirm the pin is on dry land.'
      : reqFail
        ? 'Ensure the TerraGuard API is running and reachable, then click again.'
        : 'Choose a spot on dry land—a garden bed, field, or yard—then click again. We skip the analysis pipeline when the pin is not on mapped land (e.g. open ocean).';
    return (
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="flex-1 flex flex-col justify-center items-center text-center p-8 px-6">
          <Droplets className="w-16 h-16 mb-4 text-sky-500 opacity-90" aria-hidden />
          <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
          <p className="text-slate-600 leading-relaxed max-w-sm">{locationPreflightBlock.message}</p>
          <p className="text-sm text-slate-500 mt-4">{hint}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="flex-1 flex flex-col justify-center items-center text-gray-400 text-center p-8">
          <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">No Region Selected</h2>
          <p>Click anywhere on the map to run the TerraGuard analysis pipeline for that location.</p>
        </div>
      </div>
    );
  }

  const {
    features,
    risk_analysis,
    ai_insight,
    forecast,
    crop_type,
    forecast_stress_summary,
    weather_source,
    coordinates,
  } = data;
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
                  <p className="font-semibold text-gray-800 mb-1">Next 7 days vs this plant&apos;s thresholds</p>
                  <p>
                    <span className="font-medium text-gray-700">{row.forecast_heat_days}</span> of <span className="font-medium">{fcDays}</span> forecast days have
                    daily high ≥ <span className="font-medium">{heatThr}°C</span> (this plant&apos;s heat-stress cutoff for the short-range outlook).
                  </p>
                  <p className="mt-1">
                    Longest run of days with rain below <span className="font-medium">{dryThr} mm</span>/day:{' '}
                    <span className="font-medium">{row.forecast_max_dry_streak}</span> day(s) (plant-specific &quot;very dry&quot; day threshold).
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const showSearchResults = cropSearch.trim().length >= 2;

  return (
    <div className="flex flex-col h-full min-h-0 w-full text-gray-900">
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-slate-100 bg-white">
        <h2 className="text-2xl font-bold text-gray-800">Regional Analysis</h2>
        <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 gap-1 mt-4">
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
            Plant outlook
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-0 flex flex-col gap-4">
        {tab === 'analysis' && (
          <>
          <div className={`p-6 rounded-lg text-white relative ${riskColorBg}`}>
            <div className="flex items-center justify-between">
              <div className="relative group flex items-center gap-1 cursor-help">
                <span className="text-sm uppercase tracking-wider font-semibold opacity-90">Risk Score</span>
                <Info className="w-4 h-4 opacity-70" />
                <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  {hasCropFocus
                    ? `Heuristic failure risk for ${crop_type} (most recently loaded plant) using the local rules engine.`
                    : 'Placeholder risk using Maize as a baseline until you add a plant under Plant outlook (then this updates to the latest plant you select).'}
                </div>
              </div>
            </div>
            <p className="text-xs opacity-90 mt-1 font-medium">
              {hasCropFocus ? `Latest plant loaded: ${crop_type}` : `Baseline: ${crop_type} (Change it using Plant outlook)`}
            </p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-4xl font-extrabold">{risk_analysis.score.toFixed(1)}%</span>
              <span className="text-xl font-medium">{risk_analysis.level}</span>
            </div>
          </div>

          <div>
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-blue-900 text-sm leading-relaxed shadow-inner">
              <h3 className="font-semibold text-gray-800">Regional plant fit: </h3>
              {ai_insight ?? '—'}
            </div>
          </div>


          {forecast && forecast.length > 0 && (
            <ShortRangeFieldOutlook forecast={forecast} summary={forecast_stress_summary} />
          )}


          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg flex flex-col col-span-2">
              <div className="relative group flex items-center text-amber-700 mb-2 justify-between w-full cursor-help">
                <div className="flex items-center">
                  <MountainSnow className="w-4 h-4 mr-2" />
                  <span className="text-xs uppercase font-bold">Soil Substrate</span>
                </div>
                <Info className="w-4 h-4" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                  Soil class from ISRIC SoilGrids (WRB) when available, mapped to catalog buckets (see “Signals & data sources”). Sandy soils increase drought
                  sensitivity; Clay retains moisture but raises waterlogging risk.
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
                  &gt; 0.5: Healthy dense vegetation (including productive gardens).
                </div>
              </div>
              <div className="flex justify-between items-center text-emerald-900 mt-1">
                <span className="text-xl font-semibold">{features.ndvi_current.toFixed(2)}</span>
                <span className="text-sm font-medium">Historical: {features.ndvi_historical.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <RegionalSignalsAudit features={features} weatherSource={weather_source} coordinates={coordinates} />

          <br />

        </>
      )}

      {tab === 'outlook' && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 shadow-sm flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Plant outlook</h3>
            <div className="group relative ml-auto shrink-0">
              <button
                type="button"
                className="rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-slate-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2"
                aria-label="How plant outlook works"
                aria-describedby="plant-outlook-help-popover"
              >
                <Info className="w-4 h-4" aria-hidden />
              </button>
              <div
                id="plant-outlook-help-popover"
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-[60] mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-slate-700/80 bg-gray-900 px-3 py-2.5 text-left text-xs leading-relaxed text-white shadow-xl opacity-0 invisible transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                {PLANT_OUTLOOK_HELP}
              </div>
            </div>
          </div>

          <div className="relative z-20 isolate">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="search"
              value={cropSearch}
              onChange={(e) => setCropSearch(e.target.value)}
              placeholder="Search plants (e.g. tomato, basil, marigold, wheat)…"
              className="relative z-10 w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="Search plant catalog"
              aria-expanded={showSearchResults}
              aria-controls={showSearchResults ? 'plant-catalog-search-results' : undefined}
              autoComplete="off"
            />
            {showSearchResults && (
              <ul
                id="plant-catalog-search-results"
                className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[min(36vh,320px)] overflow-y-auto space-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5"
              >
                {filteredCatalog.length === 0 && <li className="text-sm text-gray-500 px-2 py-3 text-center">No matching plants.</li>}
                {filteredCatalog.map((c) => {
                  const rowBusy = loadingCropId !== null && loadingCropId.toLowerCase() === c.id.toLowerCase();
                  const checked = isCropSelected(c.id) || rowBusy;
                  return (
                    <li key={c.id}>
                      <label
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer border border-transparent hover:bg-emerald-50/90 hover:border-emerald-100 ${
                          checked ? 'bg-emerald-50/50 border-emerald-100' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={rowBusy}
                          onChange={(e) => {
                            const next = e.target.checked;
                            if (loadingCropId !== null && next) return;
                            void onCropSelectionChange(c.id, next);
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900">{c.label}</span>
                          <span className="block text-xs text-gray-400 font-mono truncate">{c.id}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {loadingCropId !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-1">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>
                Loading outlook for <span className="font-semibold text-gray-800">{loadingCropLabel}</span>…
              </span>
            </div>
          )}

          {!showSearchResults && (
            <p className="text-xs text-gray-500 py-2 text-center">Enter at least 2 characters to search the catalog.</p>
          )}

          {forecast_stress_summary && (
            <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-emerald-200 pl-2">
              Week-wide rain, heat, and dry-run stats match the <span className="font-semibold text-slate-700">Short-range field outlook</span> on the
              Analysis tab.
            </p>
          )}

          {hasCropFocus && (
            <div className="overflow-y-auto flex-1 min-h-0 pr-1 -mr-1 border-t border-slate-200 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Comparison details</p>
              {renderCropCards(stackedCropOutlook)}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
