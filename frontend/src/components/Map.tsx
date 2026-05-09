'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix typical Leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
});

interface MapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
}

function LocationMarker({ onSelect, position }: { onSelect: any, position: any }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Selected Region for Analysis</Popup>
    </Marker>
  );
}

export default function InteractiveMap({ onLocationSelect, selectedLocation }: MapProps) {
  return (
    <MapContainer
      center={[-1.2921, 36.8219]} // Start somewhere in Kenya (impact zone example)
      zoom={5}
      className="w-full h-full rounded-2xl shadow-inner border border-gray-200"
      style={{ height: '100%', minHeight: '600px', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {/* Optional: You can swap default OSM for ESRI Satellite map easily:
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      */}
      
      <LocationMarker onSelect={onLocationSelect} position={selectedLocation} />
    </MapContainer>
  );
}
