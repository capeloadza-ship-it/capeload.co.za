'use client';

import { useEffect, useRef, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import s from './BookingMap.module.css';

/* Dark-themed map style */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a7a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#333348' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#141422' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a4a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const CAPE_TOWN = { lat: -33.9249, lng: 18.4241 };

interface BookingMapProps {
  pickupCoords: { lat: number; lng: number } | null;
  dropoffCoords: { lat: number; lng: number } | null;
}

export default function BookingMap({ pickupCoords, dropoffCoords }: BookingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const apiAvailable = useRef(false);

  /* Initialise map */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'placeholder' || !containerRef.current) return;

    setOptions({
      key: apiKey,
      v: 'weekly',
      libraries: ['places'],
    });

    importLibrary('maps')
      .then(() => {
        if (!containerRef.current) return;
        apiAvailable.current = true;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: CAPE_TOWN,
          zoom: 12,
          styles: DARK_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
        });
      })
      .catch(() => {
        /* silently fail — placeholder will show */
      });
  }, []);

  /* Helper: create SVG marker icon */
  const makeIcon = useCallback((colour: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${colour}"/>
      <circle cx="14" cy="14" r="6" fill="#fff"/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(28, 40),
      anchor: new google.maps.Point(14, 40),
    };
  }, []);

  /* Sync pickup marker */
  useEffect(() => {
    if (!apiAvailable.current || !mapRef.current) return;
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setMap(null);
      pickupMarkerRef.current = null;
    }
    if (pickupCoords) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: pickupCoords,
        map: mapRef.current,
        icon: makeIcon('#22c55e'),
        title: 'Pickup',
      });
    }
  }, [pickupCoords, makeIcon]);

  /* Sync dropoff marker */
  useEffect(() => {
    if (!apiAvailable.current || !mapRef.current) return;
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setMap(null);
      dropoffMarkerRef.current = null;
    }
    if (dropoffCoords) {
      dropoffMarkerRef.current = new google.maps.Marker({
        position: dropoffCoords,
        map: mapRef.current,
        icon: makeIcon('#f15f22'),
        title: 'Drop-off',
      });
    }
  }, [dropoffCoords, makeIcon]);

  /* Fit bounds when both markers are present */
  useEffect(() => {
    if (!apiAvailable.current || !mapRef.current) return;
    if (pickupCoords && dropoffCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupCoords);
      bounds.extend(dropoffCoords);
      mapRef.current.fitBounds(bounds, { top: 60, bottom: 340, left: 40, right: 40 });
    } else if (pickupCoords) {
      mapRef.current.panTo(pickupCoords);
      mapRef.current.setZoom(14);
    } else if (dropoffCoords) {
      mapRef.current.panTo(dropoffCoords);
      mapRef.current.setZoom(14);
    }
  }, [pickupCoords, dropoffCoords]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const showPlaceholder = !apiKey || apiKey === 'placeholder';

  return (
    <div className={s.mapWrap}>
      {showPlaceholder ? (
        <div className={s.placeholder}>
          <div className={s.placeholderInner}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#555" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>Map preview</span>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className={s.mapContainer} />
      )}
    </div>
  );
}
