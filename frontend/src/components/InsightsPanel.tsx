'use client';

import { useState } from 'react';
import axios from 'axios';

export default function InsightsPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // Hardcoded sample coordinates for the demo
      const res = await axios.post('http://localhost:8000/api/analyze', {
        lat: -1.2921, // Nairobi, Kenya
        lng: 36.8219
      });
      setData(res.data);
    } catch (error) {
      console.error("Error analyzing region", error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <button 
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "Analyzing Region..." : "Run Analysis (Demo Region)"}
      </button>

      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          
          <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Vulnerability Score</h3>
            <div className="flex items-end gap-3">
              <span className={`text-5xl font-bold ${data.risk_score > 60 ? 'text-red-500' : 'text-emerald-500'}`}>
                {data.risk_score.toFixed(0)}%
              </span>
              <span className="text-gray-400 mb-1">Risk</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">Temperature</p>
              <p className="text-xl font-semibold">{data.metrics.temperature}°C</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">Rainfall</p>
              <p className="text-xl font-semibold">{data.metrics.rainfall} mm</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-800 col-span-2">
              <p className="text-xs text-gray-500 mb-1">Vegetation Index (NDVI)</p>
              <p className="text-xl font-semibold">{data.metrics.ndvi}</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-cyan-800/50">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              watsonx.ai Insight
            </h3>
            <p className="text-gray-200 text-sm leading-relaxed">
              {data.insight}
            </p>
          </div>
          
        </div>
      )}
    </div>
  );
}