'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  MapPin,
  Camera,
  Navigation,
  Eye,
  Building2,
  Briefcase,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { AttendanceMap } from './AttendanceMap';

export interface AttendanceDetailData {
  id: string;
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'SICK' | 'BUSINESS_TRIP' | string;
  workingMinutes?: number | null;
  notes?: string | null;
  photoCheckIn?: string | null;
  photoCheckOut?: string | null;
  latitudeCheckIn?: number | null;
  longitudeCheckIn?: number | null;
  accuracyCheckIn?: number | null;
  distanceCheckIn?: number | null;
  latitudeCheckOut?: number | null;
  longitudeCheckOut?: number | null;
  accuracyCheckOut?: number | null;
  distanceCheckOut?: number | null;
  setting?: {
    locationName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  } | null;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position?: string;
    department?: { name: string } | null;
    shift?: { name: string; startTime?: string; endTime?: string } | null;
  };
  shift?: string | { name: string; startTime?: string; endTime?: string } | null;
}

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceDetailData | null;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  if (!record) return null;

  const formatWibTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
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
    return `${hrs} jam ${mins} menit (${minutes} menit)`;
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
        return status || 'HADIR';
    }
  };

  const employeeName = record.employee
    ? `${record.employee.firstName} ${record.employee.lastName}`
    : 'Unknown Employee';

  const officeLat = record.setting?.latitude ?? -6.2088;
  const officeLng = record.setting?.longitude ?? 106.8456;
  const officeRadius = record.setting?.radiusMeters ?? 100;
  const officeName = record.setting?.locationName ?? 'Kantor Utama';

  // Use checkIn coordinate for map display if available, else checkOut
  const empLat = record.latitudeCheckIn ?? record.latitudeCheckOut;
  const empLng = record.longitudeCheckIn ?? record.longitudeCheckOut;
  const empDist = record.distanceCheckIn ?? record.distanceCheckOut;
  const empAccuracy = record.accuracyCheckIn ?? record.accuracyCheckOut;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Detail Absensi Karyawan"
        description="Informasi lengkap absensi, bukti foto selfie, dan verifikasi geolokasi"
        maxWidth="lg"
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* 1. IDENTITAS KARYAWAN */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              IDENTITAS KARYAWAN
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Nama Lengkap</span>
                <strong className="text-slate-900 text-sm">{employeeName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">NIP / Employee ID</span>
                <strong className="text-slate-800 font-mono">
                  {record.employee?.employeeId || '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Jabatan</span>
                <span className="font-semibold text-slate-800">
                  {record.employee?.position || 'Staff'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Unit Kerja / Dept</span>
                <span className="font-semibold text-slate-800">
                  {record.employee?.department?.name || 'Umum'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Shift Kerja</span>
                <span className="font-semibold text-slate-800">
                  {typeof record.shift === 'string'
                    ? record.shift
                    : record.shift?.name || record.employee?.shift?.name || 'Reguler'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. ABSENSI */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              ABSENSI
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">Tanggal Absensi</span>
                <strong className="text-slate-900 text-sm">
                  {formatDate(record.attendanceDate)}
                </strong>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">Status Kehadiran</span>
                <Badge
                  variant={
                    record.status === 'PRESENT'
                      ? 'success'
                      : record.status === 'LATE'
                      ? 'warning'
                      : record.status === 'LEAVE'
                      ? 'info'
                      : 'danger'
                  }
                  dot
                >
                  {getIndonesianStatus(record.status)}
                </Badge>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">Jam Masuk</span>
                <strong className="text-slate-800 font-mono text-sm">
                  {formatWibTime(record.checkIn)}
                </strong>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">Jam Pulang</span>
                <strong className="text-slate-800 font-mono text-sm">
                  {formatWibTime(record.checkOut)}
                </strong>
              </div>
            </div>

            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total Durasi Bekerja</span>
              <strong className="text-slate-800 font-mono text-sm">
                {formatWorkingHours(record.workingMinutes)}
              </strong>
            </div>
          </div>

          {/* 3. BUKTI ABSENSI (FOTO SELFIE) */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-blue-600" />
              BUKTI ABSENSI
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Foto Masuk */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Foto Masuk</span>
                  {record.distanceCheckIn !== null && record.distanceCheckIn !== undefined && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Jarak: {record.distanceCheckIn}m
                    </span>
                  )}
                </div>
                {record.photoCheckIn ? (
                  <div
                    className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                    onClick={() =>
                      setSelectedPhoto({
                        url: record.photoCheckIn!,
                        title: `Foto Absen Masuk - ${employeeName}`,
                      })
                    }
                  >
                    <img
                      src={record.photoCheckIn}
                      alt="Foto Masuk"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-semibold gap-1.5">
                      <Eye className="h-4 w-4" />
                      Lihat Foto Penuh
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Tidak ada foto absen masuk
                  </div>
                )}
              </div>

              {/* Foto Pulang */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Foto Pulang</span>
                  {record.distanceCheckOut !== null && record.distanceCheckOut !== undefined && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Jarak: {record.distanceCheckOut}m
                    </span>
                  )}
                </div>
                {record.photoCheckOut ? (
                  <div
                    className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                    onClick={() =>
                      setSelectedPhoto({
                        url: record.photoCheckOut!,
                        title: `Foto Absen Pulang - ${employeeName}`,
                      })
                    }
                  >
                    <img
                      src={record.photoCheckOut}
                      alt="Foto Pulang"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-semibold gap-1.5">
                      <Eye className="h-4 w-4" />
                      Lihat Foto Penuh
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Belum ada foto absen pulang
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. LOKASI & GEOLOCATION */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              LOKASI & VERIFIKASI GPS
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
              {/* Lokasi Masuk */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 block">Lokasi Masuk</span>
                {record.latitudeCheckIn && record.longitudeCheckIn ? (
                  <div className="space-y-0.5 text-slate-600">
                    <p>
                      Koordinat:{' '}
                      <span className="font-mono">
                        {record.latitudeCheckIn.toFixed(6)}, {record.longitudeCheckIn.toFixed(6)}
                      </span>
                    </p>
                    <p>
                      Jarak dari kantor:{' '}
                      <strong className="text-emerald-700 font-mono">
                        {record.distanceCheckIn ?? '—'} meter
                      </strong>{' '}
                      (Maks {officeRadius}m)
                    </p>
                    {record.accuracyCheckIn !== null && record.accuracyCheckIn !== undefined && (
                      <p className="text-[11px] text-slate-500">
                        Akurasi GPS: ±{Math.round(record.accuracyCheckIn)}m
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Data GPS masuk belum dicatat</p>
                )}
              </div>

              {/* Lokasi Pulang */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 block">Lokasi Pulang</span>
                {record.latitudeCheckOut && record.longitudeCheckOut ? (
                  <div className="space-y-0.5 text-slate-600">
                    <p>
                      Koordinat:{' '}
                      <span className="font-mono">
                        {record.latitudeCheckOut.toFixed(6)}, {record.longitudeCheckOut.toFixed(6)}
                      </span>
                    </p>
                    <p>
                      Jarak dari kantor:{' '}
                      <strong className="text-emerald-700 font-mono">
                        {record.distanceCheckOut ?? '—'} meter
                      </strong>{' '}
                      (Maks {officeRadius}m)
                    </p>
                    {record.accuracyCheckOut !== null && record.accuracyCheckOut !== undefined && (
                      <p className="text-[11px] text-slate-500">
                        Akurasi GPS: ±{Math.round(record.accuracyCheckOut)}m
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Data GPS pulang belum dicatat</p>
                )}
              </div>
            </div>

            {/* PETA INTERAKTIF */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Visualisasi Peta: 📍 {officeName} & 📍 Posisi Karyawan
              </span>
              <AttendanceMap
                officeLat={officeLat}
                officeLng={officeLng}
                radiusMeters={officeRadius}
                officeName={officeName}
                employeeLat={empLat}
                employeeLng={empLng}
                employeeName={employeeName}
                distance={empDist}
                accuracy={empAccuracy}
                height="280px"
              />
            </div>
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-semibold text-slate-600">Keterangan / Catatan:</span>
              <p className="text-slate-700">{record.notes}</p>
            </div>
          )}

          {/* Footer Close */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox for Full Image Preview */}
      {selectedPhoto && (
        <Modal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          title={selectedPhoto.title}
          description="Bukti foto selfie absensi"
          maxWidth="md"
        >
          <div className="space-y-3">
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt="Foto Selfie"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedPhoto(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
