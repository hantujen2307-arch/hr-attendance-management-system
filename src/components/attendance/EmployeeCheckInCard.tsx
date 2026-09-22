'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Camera,
  Eye,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { AttendanceCaptureModal } from './AttendanceCaptureModal';
import {
  calculateHaversineDistance,
  getCurrentBrowserLocation,
  GeoLocationResult,
} from '@/lib/geo';

export interface AttendanceRecordData {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'SICK' | 'BUSINESS_TRIP';
  workingMinutes: number | null;
  attendanceDate: string;
  photoCheckIn?: string | null;
  photoCheckOut?: string | null;
  distanceCheckIn?: number | null;
  distanceCheckOut?: number | null;
  latitudeCheckIn?: number | null;
  longitudeCheckIn?: number | null;
  accuracyCheckIn?: number | null;
}

interface OfficeSettingData {
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workStartTime: string;
  toleranceMinutes: number;
  workEndTime: string;
}

interface EmployeeCheckInCardProps {
  attendanceRecord: AttendanceRecordData | null;
  officeSetting?: OfficeSettingData;
  onRefresh: () => void;
}

export const EmployeeCheckInCard: React.FC<EmployeeCheckInCardProps> = ({
  attendanceRecord,
  officeSetting,
  onRefresh,
}) => {
  // Modal & Preview state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'check-in' | 'check-out'>('check-in');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Live Server Clock (Asia/Jakarta WIB)
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Office Setting State (Dynamically synchronized with DB)
  const [activeSetting, setActiveSetting] = useState<OfficeSettingData>(
    officeSetting || {
      locationName: 'Kantor Utama',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 100,
      workStartTime: '08:00',
      toleranceMinutes: 15,
      workEndTime: '17:00',
    }
  );

  useEffect(() => {
    if (officeSetting) {
      setActiveSetting(officeSetting);
    }
  }, [officeSetting]);

  // Synchronize with database if not passed or when refreshed
  useEffect(() => {
    if (!officeSetting) {
      fetch('/api/attendance/today')
        .then((res) => res.json())
        .then((data) => {
          const payload = data.data || data;
          if (payload.setting) {
            setActiveSetting(payload.setting);
          }
        })
        .catch(() => {});
    }
  }, [officeSetting]);

  // Live client proximity & detected coordinates
  const [currentCoords, setCurrentCoords] = useState<GeoLocationResult | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [isWithinArea, setIsWithinArea] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const refreshProximity = useCallback(() => {
    setGpsError(null);
    getCurrentBrowserLocation()
      .then((coords) => {
        setCurrentCoords(coords);
        const dist = calculateHaversineDistance(
          coords.latitude,
          coords.longitude,
          activeSetting.latitude,
          activeSetting.longitude
        );
        setCurrentDistance(dist);
        setIsWithinArea(dist <= activeSetting.radiusMeters);
      })
      .catch((err) => {
        setGpsError(err.message || 'Gagal mendeteksi lokasi');
      });
  }, [activeSetting]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now) + ' WIB'
      );

      setCurrentDate(
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check proximity in background for live status display
  useEffect(() => {
    refreshProximity();
  }, [refreshProximity]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d) + ' WIB'
      );
    } catch {
      return isoString;
    }
  };

  const formatWorkingHours = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined) return '—';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs} jam ${mins} menit`;
  };

  const isCheckedIn = !!attendanceRecord?.checkIn;
  const isCheckedOut = !!attendanceRecord?.checkOut;

  const handleOpenCheckIn = () => {
    setModalMode('check-in');
    setIsModalOpen(true);
  };

  const handleOpenCheckOut = () => {
    setModalMode('check-out');
    setIsModalOpen(true);
  };

  const getIndonesianStatus = (status?: string) => {
    switch (status) {
      case 'PRESENT':
        return 'HADIR';
      case 'LATE':
        return 'TERLAMBAT';
      case 'LEAVE':
        return 'IZIN';
      case 'SICK':
        return 'SAKIT';
      case 'BUSINESS_TRIP':
        return 'DINAS';
      case 'ABSENT':
        return 'ALPHA';
      default:
        return status || 'BELUM ABSEN';
    }
  };

  return (
    <>
      <Card className="border-blue-200/80 bg-linear-to-r from-blue-50/60 via-white to-indigo-50/40 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left Section: Live Time, Date, and Location Status */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    ABSENSI HARIAN
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <strong>{currentDate || '18 September 2026'}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                      Jam Server: {currentTime || '08:00:00 WIB'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Location Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Status Absensi */}
                <div className="p-3 bg-white/90 border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-slate-400 font-medium block mb-1">Status Kehadiran</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {attendanceRecord?.status ? (
                      <Badge
                        variant={
                          attendanceRecord.status === 'PRESENT'
                            ? 'success'
                            : attendanceRecord.status === 'LATE'
                            ? 'warning'
                            : 'info'
                        }
                        dot
                      >
                        {getIndonesianStatus(attendanceRecord.status)}
                      </Badge>
                    ) : (
                      <span className="text-slate-500 font-medium">BELUM ABSEN</span>
                    )}
                  </span>
                </div>

                {/* Status Lokasi GPS */}
                <div className="p-3 bg-white/90 border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-slate-400 font-medium block mb-1">Status Lokasi</span>
                  <div className="flex items-center gap-1 font-semibold">
                    {isWithinArea === true ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        Dalam Area
                      </span>
                    ) : isWithinArea === false ? (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        Luar Area
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Mendeteksi...
                      </span>
                    )}
                  </div>
                </div>

                {/* Jarak dari Kantor */}
                <div className="p-3 bg-white/90 border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-slate-400 font-medium block mb-1">Jarak ke Kantor</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {attendanceRecord?.distanceCheckIn !== null &&
                    attendanceRecord?.distanceCheckIn !== undefined
                      ? `${attendanceRecord.distanceCheckIn} meter`
                      : currentDistance !== null
                      ? `${currentDistance} meter`
                      : '—'}
                  </span>
                </div>

                {/* Batas Radius */}
                <div className="p-3 bg-white/90 border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-slate-400 font-medium block mb-1">Batas Radius</span>
                  <span className="font-semibold text-slate-700">
                    {activeSetting.radiusMeters} meter
                  </span>
                </div>
              </div>

              {/* Real-time GPS Coordinates & Accuracy Debugging Strip */}
              {currentCoords && (
                <div className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <span>
                    GPS: {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)} (±{Math.round(currentCoords.accuracy)}m)
                  </span>
                  <span className="text-slate-400">
                    Kantor: {activeSetting.locationName} ({activeSetting.latitude.toFixed(4)}, {activeSetting.longitude.toFixed(4)})
                  </span>
                </div>
              )}

              {/* Log Details: Jam Masuk, Jam Pulang, dan Bukti Foto */}
              {isCheckedIn && (
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-5 text-xs">
                  {/* Jam Masuk */}
                  <div>
                    <span className="text-slate-400 font-medium">Jam Masuk: </span>
                    <strong className="text-slate-800 font-mono ml-1">
                      {formatTime(attendanceRecord?.checkIn)}
                    </strong>
                  </div>

                  {/* Foto Selfie Masuk */}
                  {attendanceRecord?.photoCheckIn && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Foto Masuk:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            url: attendanceRecord.photoCheckIn!,
                            title: 'Foto Selfie Masuk',
                          })
                        }
                        className="relative group h-8 w-8 rounded-lg overflow-hidden border border-slate-300 shadow-2xs cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        title="Klik untuk melihat foto"
                      >
                        <img
                          src={attendanceRecord.photoCheckIn}
                          alt="Foto Masuk"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye className="h-3 w-3" />
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Jam Pulang */}
                  {isCheckedOut && (
                    <>
                      <div>
                        <span className="text-slate-400 font-medium">Jam Pulang: </span>
                        <strong className="text-slate-800 font-mono ml-1">
                          {formatTime(attendanceRecord?.checkOut)}
                        </strong>
                      </div>

                      {/* Foto Selfie Pulang */}
                      {attendanceRecord?.photoCheckOut && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Foto Pulang:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhoto({
                                url: attendanceRecord.photoCheckOut!,
                                title: 'Foto Selfie Pulang',
                              })
                            }
                            className="relative group h-8 w-8 rounded-lg overflow-hidden border border-slate-300 shadow-2xs cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            title="Klik untuk melihat foto"
                          >
                            <img
                              src={attendanceRecord.photoCheckOut}
                              alt="Foto Pulang"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="h-3 w-3" />
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Durasi Kerja */}
                      <div>
                        <span className="text-slate-400 font-medium">Durasi: </span>
                        <strong className="text-slate-800 font-mono ml-1">
                          {formatWorkingHours(attendanceRecord?.workingMinutes)}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Section: Action Button */}
            <div className="flex flex-col items-start lg:items-end justify-center gap-2 min-w-[200px]">
              {!isCheckedIn ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleOpenCheckIn}
                  className="w-full sm:w-auto px-6 py-3 font-bold text-sm gap-2 shadow-sm bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="h-5 w-5" />
                  ABSEN MASUK
                </Button>
              ) : !isCheckedOut ? (
                <div className="w-full sm:w-auto space-y-2">
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-center font-medium">
                    Anda sudah melakukan absensi masuk.
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleOpenCheckOut}
                    className="w-full px-6 py-3 font-bold text-sm gap-2 shadow-sm bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600 text-white"
                  >
                    <LogOut className="h-5 w-5" />
                    ABSEN PULANG
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center lg:items-end gap-1">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>ABSENSI SELESAI</span>
                  </div>
                  <span className="text-[11px] text-slate-400 text-right">
                    Terima kasih atas kerja keras Anda hari ini
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS & Camera Attendance Capture Modal */}
      <AttendanceCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        mode={modalMode}
        officeSetting={activeSetting}
      />

      {/* Lightbox Modal for Photo Preview */}
      {previewPhoto && (
        <Modal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          title={previewPhoto.title}
          description="Bukti foto selfie absensi terverifikasi"
          maxWidth="sm"
        >
          <div className="space-y-3">
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={previewPhoto.url}
                alt="Foto Selfie"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewPhoto(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
