export interface ForecastDay {
  day: string;
  temp_high_c: number;
  temp_low_c: number;
  rainfall_mm: number;
}

export interface ForecastStressSummary {
  days_count: number;
  cumulative_rain_mm: number;
  max_high_c: number | null;
  min_low_c: number | null;
  days_high_ge_32c: number;
  days_rain_lt_2mm: number;
  max_consecutive_dry_days: number;
}

export interface CropOutlookRow {
  id: string;
  label: string;
  suitability_score: number;
  band: string;
  planting_verdict: string;
  planting_rationale: string;
  stress: Record<string, boolean>;
  deterministic_notes: string;
  forecast_heat_days: number;
  forecast_max_dry_streak: number;
  forecast_heat_threshold_c: number;
  forecast_dry_rain_mm_per_day: number;
  risks_text: string;
  mitigate_text: string;
}

export interface CropGuidanceItem {
  id: string;
  label: string;
  risks_text: string;
  mitigate_text: string;
}

export interface CropCatalogItem {
  id: string;
  label: string;
}

/** Full feature payload from /analyze (weather + merged agronomic layers). */
export interface AnalysisFeatures {
  ndvi_current: number;
  ndvi_historical: number;
  rainfall_today_mm: number;
  rainfall_30d_mm: number;
  temp_high_c: number;
  temp_low_c: number;
  temp_avg_c: number;
  soil_type?: string;
  /** soilgrids_v2 | synthetic | error */
  soil_source?: string;
  soil_wrb_class_name?: string | null;
  soil_probability_top?: unknown;
  vegetation_source?: string;
  ndvi_current_modis_date?: string | null;
  ndvi_historical_modis_date?: string | null;
  terrain_source?: string;
  elevation_m?: number | null;
  slope_deg?: number | null;
  gdd_base_temp_c?: number | null;
  gdd_accum_season_cd?: number | null;
  gdd_30d_cd?: number | null;
  gdd_source?: string;
  ref_et_30d_mm?: number | null;
  rain_minus_ref_et_30d_mm?: number | null;
  evapotranspiration_source?: string;
  us_county_fips?: string | null;
  us_county_name?: string | null;
  us_state_code?: string | null;
  us_calibration_source?: string | null;
  us_county_crop_note?: string | null;
  pest_pressure_hints?: string[];
  planting_calendar_note?: string;
  agronomic_hints_source?: string;
  soil_moisture_index?: number | null;
  soil_moisture_source?: string;
  /** Any future backend fields */
  [key: string]: unknown;
}

export interface AnalysisData {
  region: string;
  crop_type: string;
  coordinates?: { lat: number; lon: number };
  /** open_meteo | synthetic_fallback */
  weather_source?: string;
  focus_crop_id?: string | null;
  features: AnalysisFeatures;
  risk_analysis: {
    score: number;
    level: string;
  };
  ai_insight: string | null;
  forecast?: ForecastDay[];
  forecast_stress_summary?: ForecastStressSummary;
  crop_outlook?: CropOutlookRow[];
  crop_guidance?: CropGuidanceItem[];
  /** Initial-analyze suggestions for Plant outlook (deterministic rankings). */
  suggested_crop_outlook?: CropOutlookRow[];
}
