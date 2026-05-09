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

export interface AnalysisData {
  region: string;
  crop_type: string;
  focus_crop_id?: string | null;
  features: {
    ndvi_current: number;
    ndvi_historical: number;
    rainfall_today_mm: number;
    rainfall_30d_mm: number;
    temp_high_c: number;
    temp_low_c: number;
    temp_avg_c: number;
    soil_type?: string;
  };
  risk_analysis: {
    score: number;
    level: string;
  };
  ai_insight: string | null;
  forecast?: ForecastDay[];
  forecast_stress_summary?: ForecastStressSummary;
  crop_outlook?: CropOutlookRow[];
  crop_guidance?: CropGuidanceItem[];
}
