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
  const incomingNorm = incoming.id.toLowerCase();
  const withoutIncoming = prev.filter((r) => r.id.toLowerCase() !== incomingNorm);
  return [incoming, ...withoutIncoming];
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [stackedCropOutlook, setStackedCropOutlook] = useState<CropOutlookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCropId, setLoadingCropId] = useState<string | null>(null);
  const [locationPreflightBlock, setLocationPreflightBlock] = useState<{ message: string; reason?: string } | null>(null);
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

      const parsed = (await response.json()) as AnalysisData;
      setAnalysisData(parsed);
      setStackedCropOutlook(parsed.suggested_crop_outlook ?? []);
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

        if (!response.ok) throw new Error('Plant outlook failed');

        const next: AnalysisData = await response.json();
        const incoming = next.crop_outlook?.[0];
        if (incoming) {
          setStackedCropOutlook((prev) => upsertCropRow(prev, incoming));
        }
        setAnalysisData((prev) => {
          const merged: AnalysisData = { ...next };
          // Focus-crop responses omit ai_insight (null). Keep the initial regional IBM paragraph so we do not flash empty text;
          // InsightsPanel shows a disclaimer when catalog crops are loaded so Plant outlook stays authoritative for scores.
          if ((next.ai_insight === null || next.ai_insight === undefined) && prev?.ai_insight) {
            merged.ai_insight = prev.ai_insight;
          }
          return merged;
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error loading plant outlook:', error);
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
    setLocationPreflightBlock(null);
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const pfRes = await fetch(
        `${backendUrl}/api/v1/map-preflight?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
      );
      if (!pfRes.ok) {
        setAnalysisData(null);
        setStackedCropOutlook([]);
        setLocationPreflightBlock({
          message:
            'Land verification request failed (backend unreachable or error). Fix the connection and try again — analysis stays blocked until we can verify dry land.',
          reason: 'request_failed',
        });
        setLoading(false);
        return;
      }
      const pf = (await pfRes.json()) as {
        allow_analysis?: boolean;
        message?: string | null;
        reason?: string | null;
      };
      if (pf.allow_analysis === false) {
        setAnalysisData(null);
        setStackedCropOutlook([]);
        setLocationPreflightBlock({
          message: pf.message ?? 'Pick dry land where you can grow plants, then click again.',
          reason: pf.reason ?? undefined,
        });
        setLoading(false);
        return;
      }
      await runAnalysis(lat, lng);
    } catch (err) {
      console.error('Map preflight error:', err);
      setAnalysisData(null);
      setStackedCropOutlook([]);
      setLocationPreflightBlock({
        message:
          'Land verification failed unexpectedly. Try again — we do not run crop analysis until the land check succeeds.',
        reason: 'request_failed',
      });
      setLoading(false);
    }
  };

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-row bg-slate-100 overflow-hidden">
      <section className="flex-[2] min-w-0 min-h-0 relative flex flex-col">
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 pointer-events-none select-none">
          <div className="flex items-center gap-2 bg-transparent">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
              TerraGuard
            </h1>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
          <MapWithNoSSR onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
        </div>
      </section>

      <aside className="flex-1 min-w-[280px] max-w-xl shrink-0 flex flex-col min-h-0 overflow-hidden border-l border-slate-200 bg-white shadow-xl">
        <InsightsPanel
          data={analysisData}
          stackedCropOutlook={stackedCropOutlook}
          loading={loading}
          loadingCropId={loadingCropId}
          onCropSelectionChange={handleCropSelectionChange}
          locationPreflightBlock={locationPreflightBlock}
        />
      </aside>
    </main>
  );
}
