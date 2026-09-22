'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Compass,
  Building2,
} from 'lucide-react';
import { AttendanceMap } from '@/components/attendance/AttendanceMap';
import { getCurrentBrowserLocation } from '@/lib/geo';

export const AttendanceSettingsSection: React.FC = () => {
  const [formData, setFormData] = useState({
    locationName: 'Kantor Utama',
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 100,
    workStartTime: '08:00',
    toleranceMinutes: 15,
    workEndTime: '17:00',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Fetch current setting from database
  useEffect(() => {
    const fetchSetting = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings/attendance');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setFormData({
              locationName: data.locationName || 'Kantor Utama',
              latitude: Number(data.latitude) || -6.2088,
              longitude: Number(data.longitude) || 106.8456,
              radiusMeters: Number(data.radiusMeters) || 100,
              workStartTime: data.workStartTime || '08:00',
              toleranceMinutes: Number(data.toleranceMinutes) || 15,
              workEndTime: data.workEndTime || '17:00',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load attendance settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSetting();
  }, []);

  // Use current browser position to populate coordinates
  const handleUseCurrentLocation = async () => {
    setIsDetectingLocation(true);
    setFeedback(null);
    try {
      const coords = await getCurrentBrowserLocation();
      setFormData((prev) => ({
        ...prev,
        latitude: parseFloat(coords.latitude.toFixed(6)),
        longitude: parseFloat(coords.longitude.toFixed(6)),
      }));
      setFeedback({
        type: 'success',
        message: 'Koordinat berhasil diperbarui dari lokasi perangkat Anda saat ini.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal mendeteksi lokasi perangkat.',
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/settings/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: formData.locationName,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          radiusMeters: Number(formData.radiusMeters),
          workStartTime: formData.workStartTime,
          toleranceMinutes: Number(formData.toleranceMinutes),
          workEndTime: formData.workEndTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan pengaturan absensi.');
      }

      setFeedback({
        type: 'success',
        message: 'Pengaturan lokasi kantor dan jam kerja berhasil disimpan ke database.',
      });
    } catch (err: any) {
      console.error('Save attendance settings error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyimpan pengaturan.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          PENGATURAN ABSENSI & LOKASI KERJA
        </CardTitle>
        <CardDescription>
          Tentukan lokasi kantor, batas radius geofence (meter), jam masuk, toleransi keterlambatan, dan jam pulang
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Memuat konfigurasi absensi...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Location Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700">
                  Nama Lokasi / Kantor
                </label>
                <input
                  type="text"
                  value={formData.locationName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, locationName: e.target.value }))
                  }
                  required
                  placeholder="Contoh: Kantor Utama"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Latitude */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Latitude</label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isDetectingLocation}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="h-3 w-3" />
                    Ambil Lokasi Saat Ini
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))
                  }
                  required
                  placeholder="-6.2088"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Longitude */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))
                  }
                  required
                  placeholder="106.8456"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Radius Meters */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Radius Absensi (Meter)
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={formData.radiusMeters}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      radiusMeters: parseInt(e.target.value, 10) || 100,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 block">
                  Karyawan di luar radius ini akan ditolak saat absensi masuk/pulang.
                </span>
              </div>

              {/* Work Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Jam Masuk</label>
                <input
                  type="time"
                  value={formData.workStartTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, workStartTime: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Tolerance Minutes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Batas Toleransi Keterlambatan (Menit)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.toleranceMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      toleranceMinutes: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 block">
                  Contoh: 15 menit → absensi lewat dari {formData.workStartTime} +{' '}
                  {formData.toleranceMinutes}m otomatis berstatus <strong>TERLAMBAT</strong>.
                </span>
              </div>

              {/* Work End Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Jam Pulang</label>
                <input
                  type="time"
                  value={formData.workEndTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, workEndTime: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Map Preview */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Pratinjau Radius Lokasi Kantor pada Peta:</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Lingkaran biru = radius yang diizinkan ({formData.radiusMeters} meter)
                </span>
              </label>

              <AttendanceMap
                officeLat={formData.latitude}
                officeLng={formData.longitude}
                radiusMeters={formData.radiusMeters}
                officeName={formData.locationName}
                height="280px"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                disabled={isSaving}
                className="gap-2 font-bold shadow-xs px-6"
              >
                <Save className="h-4 w-4" />
                SIMPAN PENGATURAN
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
