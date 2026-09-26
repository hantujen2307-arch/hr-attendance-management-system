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
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, getPhotoUrl } from '@/lib/utils';
import { Clock, Eye, Edit3, CalendarCheck, MapPin, Camera } from 'lucide-react';

export interface AttendanceRecordItem {
  id: string;
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'SICK' | 'BUSINESS_TRIP' | string;
  workingMinutes?: number | null;
  notes?: string | null;
  photoCheckIn?: string | null;
  photoCheckOut?: string | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  photoUrl?: string | null;
  distanceCheckIn?: number | null;
  distanceCheckOut?: number | null;
  latitudeCheckIn?: number | null;
  longitudeCheckIn?: number | null;
  accuracyCheckIn?: number | null;
  latitudeCheckOut?: number | null;
  longitudeCheckOut?: number | null;
  accuracyCheckOut?: number | null;
  setting?: any;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position?: string;
    department?: { id: string; name: string } | null;
    shift?: { id: string; name: string } | null;
  };
}

interface AttendanceTableProps {
  records: AttendanceRecordItem[];
  isLoading?: boolean;
  canManage?: boolean;
  startIndex?: number;
  onViewDetail: (record: AttendanceRecordItem) => void;
  onEdit?: (record: AttendanceRecordItem) => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  isLoading = false,
  canManage = false,
  startIndex = 1,
  onViewDetail,
  onEdit,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
      case 'HADIR':
        return (
          <Badge variant="success" dot>
            HADIR
          </Badge>
        );
      case 'LATE':
      case 'TERLAMBAT':
        return (
          <Badge variant="warning" dot>
            TERLAMBAT
          </Badge>
        );
      case 'LEAVE':
      case 'IZIN':
        return (
          <Badge variant="info" dot>
            IZIN
          </Badge>
        );
      case 'SICK':
      case 'SAKIT':
        return (
          <Badge variant="info" dot className="bg-amber-100 text-amber-800">
            SAKIT
          </Badge>
        );
      case 'BUSINESS_TRIP':
      case 'DINAS':
        return (
          <Badge variant="info" dot className="bg-purple-100 text-purple-800">
            DINAS
          </Badge>
        );
      case 'ABSENT':
      case 'ALPHA':
      default:
        return (
          <Badge variant="danger" dot>
            ALPHA
          </Badge>
        );
    }
  };

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-3.5 w-32 bg-slate-200 rounded" />
                <div className="h-2.5 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-5 w-16 bg-slate-200 rounded-full" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Tidak ada data absensi</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Tidak ditemukan catatan absensi yang sesuai dengan kriteria filter atau tanggal yang dipilih.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Jam Masuk</TableHead>
              <TableHead>Jam Pulang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jarak</TableHead>
              <TableHead className="text-center">Foto</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, index) => {
              const employeeName = record.employee
                ? `${record.employee.firstName} ${record.employee.lastName}`
                : 'Unknown Employee';
              const departmentName = record.employee?.department?.name || 'General';

              return (
                <TableRow key={record.id}>
                  {/* No */}
                  <TableCell className="text-center text-xs font-mono text-slate-400">
                    {startIndex + index}
                  </TableCell>

                  {/* Nama */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={employeeName} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 truncate">
                          {employeeName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate font-mono">
                          {record.employee?.employeeId} • {departmentName}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Jam Masuk */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatTime(record.checkIn)}
                    </div>
                  </TableCell>

                  {/* Jam Pulang */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatTime(record.checkOut)}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(record.status)}</TableCell>

                  {/* Jarak */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs font-mono">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {record.distanceCheckIn !== null && record.distanceCheckIn !== undefined
                          ? `${record.distanceCheckIn} m`
                          : '—'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Foto Thumbnail */}
                  <TableCell className="text-center">
                    {record.photoCheckIn || record.checkInPhoto || record.photoUrl ? (
                      <div
                        className="inline-block relative h-8 w-8 rounded-md overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={() => onViewDetail(record)}
                        title="Lihat foto absensi"
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                          <Camera className="h-4 w-4" />
                        </div>
                        <img
                          src={getPhotoUrl(record.checkInPhoto || record.photoUrl || record.photoCheckIn)}
                          alt="Selfie Masuk"
                          crossOrigin="anonymous"
                          className="relative h-full w-full object-cover z-1"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs font-mono">—</span>
                    )}
                  </TableCell>

                  {/* Aksi */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetail(record)}
                        className="gap-1 h-7 text-xs px-2.5 font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        DETAIL
                      </Button>
                      {canManage && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(record)}
                          title="Edit Status"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {records.map((record, index) => {
          const employeeName = record.employee
            ? `${record.employee.firstName} ${record.employee.lastName}`
            : 'Unknown Employee';
          const departmentName = record.employee?.department?.name || 'General';

          return (
            <div
              key={record.id}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-slate-400">#{startIndex + index}</span>
                  <Avatar name={employeeName} size="sm" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{employeeName}</h4>
                    <span className="text-[10px] text-slate-400">
                      {record.employee?.employeeId} • {departmentName}
                    </span>
                  </div>
                </div>
                {getStatusBadge(record.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg">
                <div>
                  <span className="text-slate-400 text-[10px] block">Masuk:</span>
                  <span className="font-semibold text-slate-800">{formatTime(record.checkIn)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Pulang:</span>
                  <span className="font-semibold text-slate-800">{formatTime(record.checkOut)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Jarak:</span>
                  <span className="font-semibold text-slate-800">
                    {record.distanceCheckIn !== null && record.distanceCheckIn !== undefined
                      ? `${record.distanceCheckIn} m`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Tanggal:</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(record.attendanceDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {record.photoCheckIn || record.checkInPhoto || record.photoUrl ? (
                  <div
                    className="flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer"
                    onClick={() => onViewDetail(record)}
                  >
                    <img
                      src={getPhotoUrl(record.checkInPhoto || record.photoUrl || record.photoCheckIn)}
                      alt="Selfie"
                      className="h-6 w-6 rounded-md object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] font-medium">Lihat Foto</span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px]">Tanpa foto</span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetail(record)}
                  className="gap-1 h-8 text-xs font-semibold text-blue-600 border-blue-200"
                >
                  <Eye className="h-3.5 w-3.5" />
                  DETAIL
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
