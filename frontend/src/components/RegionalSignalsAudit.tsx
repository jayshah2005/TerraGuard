'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { AnalysisFeatures } from '../types/analysis';

const LABELS: Record<string, string> = {
  temp_avg_c: 'Avg temperature (forecast day 0)',
  temp_high_c: 'Daily high (forecast day 0)',
  temp_low_c: 'Daily low (forecast day 0)',
  rainfall_today_mm: 'Rainfall today',
  rainfall_30d_mm: 'Rainfall sum (30 complete days)',
  soil_type: 'Soil class (mapped)',
  soil_source: 'Soil data source',
  soil_wrb_class_name: 'WRB class (SoilGrids)',
  soil_probability_top: 'WRB class probabilities',
  ndvi_current: 'NDVI current',
  ndvi_historical: 'NDVI year-ago window',
  vegetation_source: 'Vegetation / NDVI source',
  ndvi_current_modis_date: 'MODIS composite (current)',
  ndvi_historical_modis_date: 'MODIS composite (historical)',
  elevation_m: 'Elevation (SRTM)',
  slope_deg: 'Slope (derived)',
  terrain_source: 'Terrain source',
  gdd_base_temp_c: 'GDD base temperature',
  gdd_accum_season_cd: 'GDD season-to-date',
  gdd_30d_cd: 'GDD last 30 days',
  gdd_source: 'GDD source',
  ref_et_30d_mm: 'Reference ET₀ sum (30 d)',
  rain_minus_ref_et_30d_mm: 'Rain − ref. ET (30 d)',
  evapotranspiration_source: 'ET / water-balance source',
  us_county_fips: 'US county FIPS',
  us_county_name: 'US county',
  us_state_code: 'US state',
  us_calibration_source: 'US calibration source',
  us_county_crop_note: 'US county note',
  pest_pressure_hints: 'Pest / season hints',
  planting_calendar_note: 'Planting calendar note',
  agronomic_hints_source: 'Heuristic hints source',
  soil_moisture_index: 'Soil moisture index',
  soil_moisture_source: 'Soil moisture source',
};

function humanLabel(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Deep-remove null/undefined for JSON previews so nested nulls stay hidden. */
function omitNullDeep(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const next = value.map(omitNullDeep).filter((x) => x !== undefined && x !== null);
    return next;
  }
  if (typeof value === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      const nv = omitNullDeep(v);
      if (nv === undefined) continue;
      if (typeof nv === 'object' && nv !== null && !Array.isArray(nv) && Object.keys(nv).length === 0) continue;
      o[k] = nv;
    }
    return o;
  }
  return value;
}

function jsonForDisplay(v: unknown): string {
  const cleaned = omitNullDeep(v);
  if (cleaned === undefined) return '{}';
  return JSON.stringify(cleaned, null, 2);
}

/** Exclude fields with no usable signal (null, empty, or explicit “no data” sentinels). */
function isPresentValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return false;
    if (t.toLowerCase() === 'unavailable') return false;
    return true;
  }
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  if (typeof v === 'number') return !Number.isNaN(v);
  if (typeof v === 'boolean') return true;
  return true;
}

function formatScalar(key: string, v: number): string {
  if (key.includes('ndvi')) return v.toFixed(4);
  if (
    key.includes('temp') ||
    key.includes('rain') ||
    key.includes('et') ||
    key.includes('gdd') ||
    key.includes('elevation') ||
    key.includes('slope') ||
    key.includes('moisture')
  ) {
    return Number.isInteger(v) ? String(v) : v.toFixed(v % 1 === 0 ? 0 : 1);
  }
  return String(v);
}

function valueSearchText(key: string, v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return formatScalar(key, v);
  if (typeof v === 'boolean') return v ? 'yes true' : 'no false';
  if (typeof v === 'string') return v;
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function SoilProbabilityDisplay({ v }: { v: unknown[] }) {
  return (
    <ul className="text-xs text-slate-800 space-y-1.5 w-full min-w-0">
      {v.map((item, i) => {
        if (Array.isArray(item) && item.length >= 2) {
          const name = String(item[0]);
          const pct = item[1];
          const pctStr = typeof pct === 'number' ? `${pct}%` : String(pct);
          return (
            <li key={i} className="flex justify-between gap-3 items-baseline text-right border-b border-slate-100 last:border-0 pb-1 last:pb-0">
              <span className="text-slate-600 break-words flex-1 min-w-0">{name}</span>
              <span className="tabular-nums font-semibold text-slate-900 shrink-0">{pctStr}</span>
            </li>
          );
        }
        return (
          <li key={i} className="font-mono text-[10px] text-slate-600 text-right break-all">
            {JSON.stringify(item)}
          </li>
        );
      })}
    </ul>
  );
}

function SignalValue({ k, v }: { k: string; v: unknown }) {
  if (k === 'soil_probability_top' && Array.isArray(v)) {
    return <SoilProbabilityDisplay v={v} />;
  }

  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return <span className="text-slate-400">—</span>;
    const long = t.length > 100;
    return (
      <span
        className={`text-slate-800 break-words hyphens-auto ${long ? 'text-xs leading-relaxed block text-right max-w-full' : ''}`}
      >
        {v}
      </span>
    );
  }

  if (typeof v === 'number' && !Number.isNaN(v)) {
    return <span className="tabular-nums text-slate-800">{formatScalar(k, v)}</span>;
  }
  if (typeof v === 'boolean') {
    return <span className="text-slate-800">{v ? 'Yes' : 'No'}</span>;
  }
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string')) {
      return <span className="text-slate-800 break-words text-right">{v.join(', ')}</span>;
    }
    return (
      <pre className="text-[11px] leading-snug whitespace-pre-wrap break-all text-slate-700 font-mono bg-slate-50 rounded px-2 py-1 border border-slate-100 max-w-full overflow-x-auto">
        {jsonForDisplay(v)}
      </pre>
    );
  }
  if (typeof v === 'object' && v !== null) {
    return (
      <pre className="text-[11px] leading-snug whitespace-pre-wrap break-all text-slate-700 font-mono bg-slate-50 rounded px-2 py-1 border border-slate-100 max-h-48 overflow-y-auto max-w-full">
        {jsonForDisplay(v)}
      </pre>
    );
  }
  return <span className="text-slate-800 break-words">{String(v)}</span>;
}

type Group = { title: string; keys: string[] };

const GROUPS: Group[] = [
  {
    title: 'Temperature & rainfall',
    keys: ['temp_avg_c', 'temp_high_c', 'temp_low_c', 'rainfall_today_mm', 'rainfall_30d_mm'],
  },
  {
    title: 'Soil (SoilGrids v2)',
    keys: ['soil_type', 'soil_source', 'soil_wrb_class_name', 'soil_probability_top'],
  },
  {
    title: 'Vegetation (MODIS NDVI)',
    keys: [
      'ndvi_current',
      'ndvi_historical',
      'vegetation_source',
      'ndvi_current_modis_date',
      'ndvi_historical_modis_date',
    ],
  },
  {
    title: 'Terrain (DEM)',
    keys: ['elevation_m', 'slope_deg', 'terrain_source'],
  },
  {
    title: 'Growing degree days',
    keys: ['gdd_base_temp_c', 'gdd_accum_season_cd', 'gdd_30d_cd', 'gdd_source'],
  },
  {
    title: 'Evapotranspiration & water balance',
    keys: ['ref_et_30d_mm', 'rain_minus_ref_et_30d_mm', 'evapotranspiration_source'],
  },
  {
    title: 'United States calibration',
    keys: ['us_county_fips', 'us_county_name', 'us_state_code', 'us_calibration_source', 'us_county_crop_note'],
  },
  {
    title: 'Seasonal heuristics',
    keys: ['pest_pressure_hints', 'planting_calendar_note', 'agronomic_hints_source'],
  },
  {
    title: 'Soil moisture (stub)',
    keys: ['soil_moisture_index', 'soil_moisture_source'],
  },
];

const ORDERED_KEYS = new Set(GROUPS.flatMap((g) => g.keys));

type DataRow = {
  group: string;
  key: string;
  label: string;
  value: unknown;
};

function buildDataRows(
  features: AnalysisFeatures,
  coordinates?: { lat: number; lon: number },
  weatherSource?: string
): DataRow[] {
  const rows: DataRow[] = [];

  if (coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon)) {
    rows.push({
      group: 'Site & pipeline',
      key: '_coordinates',
      label: 'Coordinates',
      value: `${coordinates.lat.toFixed(5)}, ${coordinates.lon.toFixed(5)}`,
    });
  }
  if (weatherSource && isPresentValue(weatherSource)) {
    rows.push({
      group: 'Site & pipeline',
      key: '_weather_pipeline',
      label: 'Weather pipeline',
      value: weatherSource,
    });
  }

  for (const group of GROUPS) {
    for (const key of group.keys) {
      const v = features[key as keyof AnalysisFeatures];
      if (!isPresentValue(v)) continue;
      rows.push({ group: group.title, key, label: humanLabel(key), value: v });
    }
  }

  const extraKeys = Object.keys(features)
    .filter((k) => !ORDERED_KEYS.has(k))
    .sort();

  for (const key of extraKeys) {
    const v = features[key];
    if (!isPresentValue(v)) continue;
    rows.push({ group: 'Additional fields', key, label: key, value: v });
  }

  return rows;
}

function rowMatchesQuery(row: DataRow, q: string): boolean {
  if (!q) return true;
  const hay = `${row.group} ${row.key} ${row.label} ${valueSearchText(row.key, row.value)}`.toLowerCase();
  return hay.includes(q);
}

interface Props {
  features: AnalysisFeatures;
  weatherSource?: string;
  coordinates?: { lat: number; lon: number };
}

export default function RegionalSignalsAudit({ features, weatherSource, coordinates }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const allRows = useMemo(
    () => buildDataRows(features, coordinates, weatherSource),
    [features, coordinates, weatherSource]
  );

  const q = query.trim().toLowerCase();
  const filteredRows = useMemo(() => allRows.filter((row) => rowMatchesQuery(row, q)), [allRows, q]);

  const groupedForDisplay = useMemo(() => {
    const map = new Map<string, DataRow[]>();
    for (const row of filteredRows) {
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return map;
  }, [filteredRows]);

  const groupOrder = Array.from(
    new Set(['Site & pipeline', ...GROUPS.map((g) => g.title), 'Additional fields'])
  );

  const orderedSections = groupOrder.filter((title) => groupedForDisplay.has(title));

  return (
    <div className="rounded-xl border-2 border-emerald-200/90 bg-white shadow-sm ring-1 ring-slate-200/80 overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left bg-gradient-to-b from-emerald-50/90 to-white hover:from-emerald-50 hover:to-slate-50/90 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Signals & data sources</h3>
          <p className="text-xs text-slate-500 mt-1 leading-snug">
            Open-data layers merged for this run. Empty or unavailable fields are hidden.
          </p>
          <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
            {allRows.length} field{allRows.length === 1 ? '' : 's'} with data
            {expanded && filteredRows.length !== allRows.length && q ? ` · ${filteredRows.length} match search` : ''}
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-slate-500 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-200 bg-white/60">
          <div className="p-3 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, key, or value…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                aria-label="Search signals"
              />
            </div>
          </div>

          <div className="p-4 max-h-[min(65vh,480px)] overflow-y-auto">
            {filteredRows.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                {allRows.length === 0
                  ? 'No signal fields available for this analysis.'
                  : q
                    ? 'No fields match your search.'
                    : 'No fields to show.'}
              </p>
            ) : (
              <div className="space-y-5">
                {orderedSections.map((sectionTitle) => {
                  const sectionRows = groupedForDisplay.get(sectionTitle);
                  if (!sectionRows?.length) return null;
                  return (
                    <div key={sectionTitle}>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">{sectionTitle}</h4>
                      <dl className="grid grid-cols-1 gap-y-2 text-sm">
                        {sectionRows.map((row) => (
                          <div
                            key={`${row.group}-${row.key}`}
                            className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3 border-b border-slate-100/90 pb-3 last:border-0 last:pb-0"
                          >
                            <dt className="text-slate-500 shrink-0 sm:w-[40%]">
                              <span className="font-medium text-slate-600">{row.label}</span>
                              {row.key.startsWith('_') ? null : (
                                <span className="block text-[10px] font-mono text-slate-400 mt-0.5 break-all">{row.key}</span>
                              )}
                            </dt>
                            <dd className="min-w-0 flex-1 text-right sm:text-right flex flex-col items-stretch sm:items-end">
                              <div className="w-full max-w-full">
                                <SignalValue k={row.key} v={row.value} />
                              </div>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
