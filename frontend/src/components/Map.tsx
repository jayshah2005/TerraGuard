'use client';
import { useEffect, useState } from 'react';

// For Next.js to dynamically import Leaflet without SSR issues
export default function Map() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-gray-800 flex items-center justify-center">Loading Map...</div>;

  return (
    <div className="w-full h-full bg-gray-800 relative">
      {/* 
        In reality, you would use React-Leaflet here:
        <MapContainer center={[-1.2921, 36.8219]} zoom={6} scrollWheelZoom={true} className="w-full h-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[-1.2921, 36.8219]} />
        </MapContainer>
      */}
      <div className="absolute inset-0 flex items-center justify-center p-20 text-center text-gray-500">
        <div className="border border-dashed border-gray-600 rounded-2xl w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-800/50">
           <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
           </svg>
           <p>Interactive Map Component (Leaflet/Mapbox)</p>
        </div>
      </div>
    </div>
  );
}