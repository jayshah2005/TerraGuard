'use client';
import React from 'react';
import { Leaf, Droplets, ThermometerSun, AlertTriangle, Info, MountainSnow } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface ForecastDay {
  day: string;
  temp_high_c: number;
  temp_low_c: number;
  rainfall_mm: number;
}

interface AnalysisData {
  region: string;
  crop_type: string;
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
  ai_insight: string;
  forecast?: ForecastDay[];
}

interface Props {
  data: AnalysisData | null;
  loading: boolean;
}

export default function InsightsPanel({ data, loading }: Props) {
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

  const { features, risk_analysis, ai_insight, forecast, crop_type } = data;
  
  let riskColorBg = 'bg-emerald-500';
  if (risk_analysis.level === 'Critical' || risk_analysis.level === 'High') {
    riskColorBg = 'bg-red-500';
  } else if (risk_analysis.level === 'Moderate') {
    riskColorBg = 'bg-amber-500';
  }

  return (
    <div className="p-6 h-full overflow-y-auto w-full bg-white text-gray-900 shadow-xl border-l flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-gray-800">Regional Analysis ({crop_type || "Maize"})</h2>
      
      {/* Risk Score */}
      <div className={`p-6 rounded-lg text-white relative ${riskColorBg}`}>
        <div className="flex items-center justify-between">
            <div className="relative group flex items-center gap-1 cursor-help">
                <span className="text-sm uppercase tracking-wider font-semibold opacity-90">Risk Score</span>
                <Info className="w-4 h-4 opacity-70" />
                <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-56 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                    Calculated by IBM watsonx.ai. Probability of crop failure based on weather, soil, and vegetation patterns.
                </div>
            </div>
        </div>
        <div className="flex items-end justify-between mt-2">
          <span className="text-4xl font-extrabold">{risk_analysis.score.toFixed(1)}%</span>
          <span className="text-xl font-medium">{risk_analysis.level}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Soil Type */}
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
          <span className="text-xl font-semibold text-amber-900">{features.soil_type || "Loam"} Baseline</span>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg flex flex-col">
          <div className="flex items-center text-gray-500 mb-2">
            <ThermometerSun className="w-4 h-4 mr-2 text-rose-500" />
            <span className="text-xs uppercase font-bold">Temperature</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-gray-800">Avg {features.temp_avg_c.toFixed(1)}°C</span>
            <span className="text-xs text-gray-500 font-medium">H: {features.temp_high_c.toFixed(1)}° · L: {features.temp_low_c.toFixed(1)}°</span>
          </div>
        </div>
        
        {/* Rainfall */}
        <div className="bg-gray-50 p-4 rounded-lg flex flex-col">
          <div className="relative group flex items-center text-gray-500 mb-2 justify-between w-full cursor-help">
            <div className="flex items-center">
              <Droplets className="w-4 h-4 mr-2 text-blue-500" />
              <span className="text-xs uppercase font-bold">Rainfall</span>
            </div>
            <Info className="w-4 h-4" />
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                Displays today's local rainfall, followed by the rolling 30-day cumulative history.
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
                <br/><br/>&lt; 0.2: Extreme stress/Barren.
                <br/>&gt; 0.5: Healthy dense crops.
            </div>
          </div>
          <div className="flex justify-between items-center text-emerald-900 mt-1">
            <span className="text-xl font-semibold">{features.ndvi_current.toFixed(2)}</span>
            <span className="text-sm font-medium">Historical: {features.ndvi_historical.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* IBM Watsonx AI Insight */}
      <div>
        <div className="flex items-center mb-3">
          <div className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold text-white tracking-wide">
            IBM watsonx.ai
          </div>
          <h3 className="ml-3 font-semibold text-gray-800">Generative Insight</h3>
        </div>
        <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-blue-900 text-sm leading-relaxed shadow-inner">
          {ai_insight}
        </div>
      </div>

      {/* 7-Day Risk Forecast Graph */}
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
                        <XAxis dataKey="day" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tick={{fontSize: 12}} width={30} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} width={30} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                            formatter={(value: number, name: string) => {
                                if (name === 'temp_high_c') return [`${value.toFixed(1)}°C`, 'High Temp'];
                                if (name === 'temp_low_c') return [`${value.toFixed(1)}°C`, 'Low Temp'];
                                if (name === 'rainfall_mm') return [`${value.toFixed(1)}mm`, 'Rainfall'];
                                return [value, name];
                            }}
                            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                        />
                        
                        <Bar yAxisId="right" name="rainfall_mm" dataKey="rainfall_mm" fill="#3b82f6" opacity={0.5} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="left" type="monotone" name="temp_high_c" dataKey="temp_high_c" stroke="#ef4444" strokeWidth={3} dot={false} />
                        <Line yAxisId="left" type="monotone" name="temp_low_c" dataKey="temp_low_c" stroke="#f59e0b" strokeWidth={3} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
}
