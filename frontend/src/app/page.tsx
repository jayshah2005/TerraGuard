'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import InsightsPanel from '../components/InsightsPanel';
import type { AnalysisData, CropOutlookRow } from '../types/analysis';

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse rounded-2xl border">Loading Map...</div>
  ),
});

function regionLabel(lat: number, lng: number) {
  return `Custom Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
}

function upsertCropRow(prev: CropOutlookRow[], incoming: CropOutlookRow): CropOutlookRow[] {
  const i = prev.findIndex((r) => r.id.toLowerCase() === incoming.id.toLowerCase());
  if (i === -1) return [...prev, incoming];
  const next = [...prev];
  next[i] = incoming;
  return next;
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [stackedCropOutlook, setStackedCropOutlook] = useState<CropOutlookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCropId, setLoadingCropId] = useState<string | null>(null);
  const cropOutlookInflightRef = useRef<{ cropId: string; controller: AbortController } | null>(null);

  const runAnalysis = useCallback(async (lat: number, lng: number) => {
    cropOutlookInflightRef.current?.controller.abort();
    cropOutlookInflightRef.current = null;
    setLoadingCropId(null);
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon: lng,
          region_name: regionLabel(lat, lng),
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      setAnalysisData(await response.json());
      setStackedCropOutlook([]);
    } catch (error) {
      console.error('Error analyzing region:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCropSelectionChange = useCallback(
    async (cropId: string, selected: boolean) => {
      if (!selectedLocation) return;
      const idNorm = cropId.trim().toLowerCase();

      if (!selected) {
        setStackedCropOutlook((prev) => prev.filter((r) => r.id.toLowerCase() !== idNorm));
        const inf = cropOutlookInflightRef.current;
        if (inf && inf.cropId.toLowerCase() === idNorm) {
          inf.controller.abort();
          cropOutlookInflightRef.current = null;
          setLoadingCropId(null);
        }
        return;
      }

      cropOutlookInflightRef.current?.controller.abort();
      const controller = new AbortController();
      cropOutlookInflightRef.current = { cropId, controller };

      setLoadingCropId(cropId);
      try {
        const { lat, lng } = selectedLocation;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lon: lng,
            region_name: regionLabel(lat, lng),
            focus_crop_id: cropId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Crop outlook failed');

        const next: AnalysisData = await response.json();
        const incoming = next.crop_outlook?.[0];
        if (incoming) {
          setStackedCropOutlook((prev) => upsertCropRow(prev, incoming));
        }
        setAnalysisData((prev) => {
          const merged: AnalysisData = { ...next };
          if ((next.ai_insight === null || next.ai_insight === undefined) && prev?.ai_insight) {
            merged.ai_insight = prev.ai_insight;
          }
          return merged;
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error loading crop outlook:', error);
      } finally {
        if (!controller.signal.aborted) {
          cropOutlookInflightRef.current = null;
          setLoadingCropId(null);
        }
      }
    },
    [selectedLocation]
  );

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    await runAnalysis(lat, lng);
  };

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col bg-slate-50 overflow-hidden">
      <header className="shrink-0 bg-white shadow-sm border-b px-8 py-4 flex items-center justify-between z-10 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-900 tracking-tight">
            TerraGuard
          </h1>
        </div>

        <div className="text-sm font-semibold text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
          SDG 2 & 13 Prototype
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <section className="w-2/3 p-6 flex flex-col min-h-0 overflow-hidden relative">
          <div className="mb-4 flex-none">
            <h2 className="text-lg font-bold text-slate-800">Global Monitoring</h2>
            <p className="text-sm text-slate-500">
              Select a region for climate signals and regional guidance. Open <span className="font-semibold text-slate-700">Crop outlook</span>, search the
              catalog, and tick crops to compare suitability side by side.
            </p>
          </div>
          <div className="flex-1 rounded-2xl relative z-0 min-h-[320px]">
            <MapWithNoSSR onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
          </div>
        </section>

        <aside className="w-1/3 min-w-[280px] max-w-xl shrink-0 flex flex-col min-h-0 overflow-hidden border-l border-slate-200 bg-white shadow-xl">
          <InsightsPanel
            data={analysisData}
            stackedCropOutlook={stackedCropOutlook}
            loading={loading}
            loadingCropId={loadingCropId}
            onCropSelectionChange={handleCropSelectionChange}
          />
        </aside>
      </div>
    </main>
  );
}
