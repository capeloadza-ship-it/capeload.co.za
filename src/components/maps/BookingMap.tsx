'use client';

import { useEffect, useRef } from 'react';
import s from './BookingMap.module.css';

interface BookingMapProps {
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
}

export default function BookingMap({ pickupCoords, dropoffCoords }: BookingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || !mapRef.current) return;
    loadedRef.current = true;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      // Create map centered on Cape Town
      const map = L.map(mapRef.current!, {
        center: [-33.9249, 18.4241],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    // Add Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }
  }, []);

  // Update markers when coords change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current!;

      // Green pickup marker
      if (pickupCoords) {
        if (pickupMarkerRef.current) {
          pickupMarkerRef.current.setLatLng([pickupCoords.lat, pickupCoords.lng]);
        } else {
          const greenIcon = L.divIcon({
            className: s.pickupPin,
            html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          pickupMarkerRef.current = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: greenIcon }).addTo(map);
        }
      }

      // Orange dropoff marker
      if (dropoffCoords) {
        if (dropoffMarkerRef.current) {
          dropoffMarkerRef.current.setLatLng([dropoffCoords.lat, dropoffCoords.lng]);
        } else {
          const orangeIcon = L.divIcon({
            className: s.dropoffPin,
            html: '<div style="width:16px;height:16px;background:#f15f22;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          dropoffMarkerRef.current = L.marker([dropoffCoords.lat, dropoffCoords.lng], { icon: orangeIcon }).addTo(map);
        }
      }

      // Fit bounds if both markers exist
      if (pickupCoords && dropoffCoords) {
        const bounds = L.latLngBounds(
          [pickupCoords.lat, pickupCoords.lng],
          [dropoffCoords.lat, dropoffCoords.lng]
        );
        map.fitBounds(bounds, { padding: [60, 60] });
      } else if (pickupCoords) {
        map.setView([pickupCoords.lat, pickupCoords.lng], 14);
      } else if (dropoffCoords) {
        map.setView([dropoffCoords.lat, dropoffCoords.lng], 14);
      }
    });
  }, [pickupCoords, dropoffCoords]);

  return <div ref={mapRef} className={s.map} />;
}
