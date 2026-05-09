'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import InsightsPanel from '../components/InsightsPanel';

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse rounded-2xl border">Loading Map...</div>,
});

const CROPS = ["Maize", "Wheat", "Rice", "Sorghum", "Soybeans"];

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cropType, setCropType] = useState("Maize");

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setLoading(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            lat, 
            lon: lng, 
            region_name: `Custom Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
            crop_type: cropType
        }),
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      setAnalysisData(await response.json());
    } catch (error) {
      console.error("Error analyzing region:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCrop = e.target.value;
    setCropType(newCrop);
    // If a location is already selected, re-analyze automatically
    if (selectedLocation) {
        handleLocationSelect(selectedLocation.lat, selectedLocation.lng);
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-50 flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-8 py-4 flex items-center justify-between z-10 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-900 tracking-tight">
            TerraGuard
          </h1>
        </div>
        
        <div className="flex items-center gap-4 border p-2 rounded-lg bg-gray-50">
          <span className="text-sm font-bold text-gray-700">Target Crop:</span>
          <select 
            value={cropType} 
            onChange={handleCropChange}
            className="bg-white border rounded px-3 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 hover:cursor-pointer"
          >
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div className="text-sm font-semibold text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
          SDG 2 & 13 Prototype
        </div>
      </header>

      {/* Main Panel */}
      <div className="flex-1 flex overflow-hidden">
        <section className="w-2/3 p-6 flex flex-col h-full relative">
          <div className="mb-4 flex-none">
            <h2 className="text-lg font-bold text-slate-800">Global Monitoring</h2>
            <p className="text-sm text-slate-500">Select a region to generate immediate AI climate vulnerability metrics for {cropType}.</p>
          </div>
          <div className="flex-1 rounded-2xl relative z-0">
            <MapWithNoSSR 
              onLocationSelect={handleLocationSelect} 
              selectedLocation={selectedLocation} 
            />
          </div>
        </section>

        <aside className="w-1/3 h-full">
          <InsightsPanel data={analysisData} loading={loading} />
        </aside>
      </div>
    </main>
  );
}
