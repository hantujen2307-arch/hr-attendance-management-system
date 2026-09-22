'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import {
  Clock,
  FileText,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Camera,
} from 'lucide-react';

export interface ReportAttendanceRow {
  id: string;
  employee: string;
  employeeId?: string;
  department: string;
  position?: string;
  shift?: string;
  scheduledCheckIn?: string;
  scheduledCheckOut?: string;
  diffMinutes?: number | null;
  diffFormatted?: string;
  date: string;
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
  setting?: any;
}

interface ReportTableProps {
  records: ReportAttendanceRow[];
  isLoading: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onViewDetail: (record: ReportAttendanceRow) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  records,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetail,
}) => {
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

  const formatHours = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined) return '—';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}j ${mins}m`;
  };

  const getStatusBadge = (status: string, notes?: string | null) => {
    switch (status) {
      case 'PRESENT':
        return (
          <Badge variant="success" dot className="text-[10px]">
            HADIR
          </Badge>
        );
      case 'LATE':
        return (
          <Badge variant="warning" dot className="text-[10px]">
            TERLAMBAT
          </Badge>
        );
      case 'LEAVE':
        if (notes?.toLowerCase().includes('cuti')) {
          return (
            <Badge variant="default" dot className="text-[10px]">
              CUTI
            </Badge>
          );
        }
        return (
          <Badge variant="info" dot className="text-[10px]">
            IZIN
          </Badge>
        );
      case 'SICK':
        return (
          <Badge variant="info" dot className="text-[10px]">
            SAKIT
          </Badge>
        );
      case 'BUSINESS_TRIP':
        return (
          <Badge variant="default" dot className="text-[10px]">
            DINAS
          </Badge>
        );
      case 'ABSENT':
        return (
          <Badge variant="danger" dot className="text-[10px]">
            ALPHA
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" dot className="text-[10px]">
            {status || 'BELUM ABSEN'}
          </Badge>
        );
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400 ml-1 inline" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-600 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600 ml-1 inline" />
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden p-6 space-y-3 shadow-xs">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse py-2">
            <div className="flex items-center gap-3">
              <div className="h-4 w-6 bg-slate-200 rounded" />
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="space-y-1">
                <div className="h-3 w-32 bg-slate-200 rounded" />
                <div className="h-2 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
            <div className="h-5 w-16 bg-slate-200 rounded-full" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <FileText className="h-6 w-6 stroke-1" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">Tidak ada data absensi untuk filter yang dipilih</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Silakan sesuaikan filter tanggal, unit kerja, atau kata kunci pencarian Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 select-none transition-colors"
                onClick={() => onSort && onSort('attendanceDate')}
              >
                Tanggal {renderSortIcon('attendanceDate')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 select-none transition-colors"
                onClick={() => onSort && onSort('name')}
              >
                Nama Karyawan {renderSortIcon('name')}
              </TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Unit Kerja</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 select-none transition-colors"
                onClick={() => onSort && onSort('checkIn')}
              >
                Jam Masuk {renderSortIcon('checkIn')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 select-none transition-colors"
                onClick={() => onSort && onSort('checkOut')}
              >
                Jam Pulang {renderSortIcon('checkOut')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 select-none transition-colors"
                onClick={() => onSort && onSort('status')}
              >
                Status {renderSortIcon('status')}
              </TableHead>
              <TableHead>Lokasi / Jarak</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((rec, index) => (
              <TableRow
                key={rec.id}
                className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                onClick={() => onViewDetail(rec)}
              >
                {/* No */}
                <TableCell className="text-center font-mono text-xs text-slate-500">
                  {index + 1}
                </TableCell>

                {/* Tanggal */}
                <TableCell>
                  <span className="text-xs font-semibold text-slate-800">
                    {formatDate(rec.date)}
                  </span>
                </TableCell>

                {/* Nama Karyawan */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      {rec.employee}
                    </span>
                    {rec.photoCheckIn && (
                      <span title="Tersedia foto selfie masuk" className="text-blue-500">
                        <Camera className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block">{rec.position || 'Staff'}</span>
                </TableCell>

                {/* NIP */}
                <TableCell>
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {rec.employeeId || '—'}
                  </span>
                </TableCell>

                {/* Unit Kerja */}
                <TableCell>
                  <span className="text-xs text-slate-600 truncate max-w-[140px] block">
                    {rec.department}
                  </span>
                </TableCell>

                {/* Shift */}
                <TableCell>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                    {rec.shift || 'Reguler'}
                  </span>
                </TableCell>

                {/* Jam Masuk */}
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-800">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{formatTime(rec.checkIn)}</span>
                    </div>
                    {rec.scheduledCheckIn && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Jadwal: {rec.scheduledCheckIn}
                        {rec.diffFormatted && rec.diffFormatted !== '-' && (
                          <span
                            className={`ml-1 font-semibold ${
                              rec.diffMinutes && rec.diffMinutes > 0
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            ({rec.diffFormatted})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Jam Pulang */}
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-700">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{formatTime(rec.checkOut)}</span>
                    </div>
                    {rec.scheduledCheckOut && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Jadwal: {rec.scheduledCheckOut}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>{getStatusBadge(rec.status, rec.notes)}</TableCell>

                {/* Lokasi / Jarak */}
                <TableCell>
                  {rec.distanceCheckIn !== null && rec.distanceCheckIn !== undefined ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${
                        rec.distanceCheckIn <= 100
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      {rec.distanceCheckIn} m
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>

                {/* Keterangan */}
                <TableCell className="max-w-[160px]">
                  <p className="text-xs text-slate-500 truncate" title={rec.notes || ''}>
                    {rec.notes || '—'}
                  </p>
                </TableCell>

                {/* Aksi */}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs h-7 px-2 font-medium text-blue-600 hover:bg-blue-50"
                    onClick={() => onViewDetail(rec)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
