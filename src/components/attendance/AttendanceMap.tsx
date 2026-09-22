'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface AttendanceMapProps {
  officeLat: number;
  officeLng: number;
  radiusMeters: number;
  officeName?: string;
  employeeLat?: number | null;
  employeeLng?: number | null;
  employeeName?: string;
  distance?: number | null;
  accuracy?: number | null;
  height?: string;
  interactive?: boolean;
}

export const AttendanceMap: React.FC<AttendanceMapProps> = ({
  officeLat,
  officeLng,
  radiusMeters,
  officeName = 'Kantor Utama',
  employeeLat,
  employeeLng,
  employeeName = 'Karyawan',
  distance,
  accuracy,
  height = '320px',
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      // Fix missing leaflet default marker icons in webpack/nextjs
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: false,
      }).setView([officeLat, officeLng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Office Icon
      const officeIcon = L.divIcon({
        className: 'custom-office-pin',
        html: `<div style="background:#2563eb;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;font-size:16px;">🏢</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      // Office marker
      const officeMarker = L.marker([officeLat, officeLng], { icon: officeIcon })
        .addTo(map)
        .bindPopup(`<strong>📍 ${officeName}</strong><br/>Area Absensi: Radius ${radiusMeters}m`);

      // Office Radius Geofence Circle
      L.circle([officeLat, officeLng], {
        radius: radiusMeters,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);

      const bounds = L.latLngBounds([[officeLat, officeLng]]);

      // Employee Marker (if coordinates provided)
      if (employeeLat && employeeLng) {
        const isWithinRadius = distance ? distance <= radiusMeters : true;
        const empBgColor = isWithinRadius ? '#10b981' : '#ef4444'; // green if within, red if outside

        const empIcon = L.divIcon({
          className: 'custom-emp-pin',
          html: `<div style="background:${empBgColor};color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;font-size:16px;">👤</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const empMarker = L.marker([employeeLat, employeeLng], { icon: empIcon })
          .addTo(map)
          .bindPopup(
            `<strong>${employeeName}</strong><br/>` +
              `Status Lokasi: <span style="color:${empBgColor};font-weight:bold;">${
                isWithinRadius ? 'DALAM RADIUS' : 'DI LUAR RADIUS'
              }</span><br/>` +
              (distance !== null && distance !== undefined
                ? `Jarak ke kantor: <strong>${distance} meter</strong><br/>`
                : '') +
              (accuracy !== null && accuracy !== undefined
                ? `Akurasi GPS: <strong>±${Math.round(accuracy)} meter</strong>`
                : '')
          );

        bounds.extend([employeeLat, employeeLng]);

        // Draw connecting line between office and employee
        L.polyline(
          [
            [officeLat, officeLng],
            [employeeLat, employeeLng],
          ],
          {
            color: isWithinRadius ? '#10b981' : '#ef4444',
            weight: 2,
            dashArray: '6, 6',
          }
        ).addTo(map);

        map.fitBounds(bounds, { padding: [40, 40] });
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [
    officeLat,
    officeLng,
    radiusMeters,
    officeName,
    employeeLat,
    employeeLng,
    employeeName,
    distance,
    accuracy,
    interactive,
  ]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-medium text-slate-700 shadow-xs border border-slate-200 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
          Kantor ({radiusMeters}m radius)
        </span>
        {employeeLat && employeeLng && (
          <span className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full inline-block ${
                distance && distance <= radiusMeters ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            Posisi Absen ({distance ?? 0}m)
          </span>
        )}
      </div>
    </div>
  );
};
