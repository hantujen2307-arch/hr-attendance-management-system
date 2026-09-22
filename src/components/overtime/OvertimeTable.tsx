'use client';

import React from 'react';
import {
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Ban,
  Edit3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OvertimeRecord, OvertimeStatus, UserRole } from '@/types';

interface OvertimeTableProps {
  records: OvertimeRecord[];
  isLoading: boolean;
  currentRole: UserRole;
  onViewDetail: (record: OvertimeRecord) => void;
  onEdit?: (record: OvertimeRecord) => void;
  onApprove?: (record: OvertimeRecord) => void;
  onReject?: (record: OvertimeRecord) => void;
  onCancel?: (record: OvertimeRecord) => void;
}

export const OvertimeTable: React.FC<OvertimeTableProps> = ({
  records,
  isLoading,
  currentRole,
  onViewDetail,
  onEdit,
  onApprove,
  onReject,
  onCancel,
}) => {
  const isEmployee = currentRole === 'EMPLOYEE';

  const getStatusBadge = (status: OvertimeStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Disetujui
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Ditolak
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            Dibatalkan
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Selesai
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-8 space-y-4 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          Belum Ada Data Pengajuan Lembur
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          {isEmployee
            ? 'Anda belum memiliki riwayat lembur. Klik tombol "Ajukan Lembur" untuk membuat pengajuan baru.'
            : 'Tidak ada pengajuan lembur yang sesuai dengan kriteria filter saat ini.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">Tanggal</th>
              {!isEmployee && <th className="py-3.5 px-4">Karyawan</th>}
              <th className="py-3.5 px-4">Shift</th>
              <th className="py-3.5 px-4">Jam Rencana</th>
              <th className="py-3.5 px-4">Jam Aktual</th>
              <th className="py-3.5 px-4">Durasi</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((rec) => {
              const shiftName = rec.schedule?.shift?.name || 'Shift Reguler';
              const employeeName = rec.employee
                ? `${rec.employee.firstName} ${rec.employee.lastName}`
                : 'Karyawan';

              return (
                <tr
                  key={rec.id}
                  className="hover:bg-slate-50/70 transition-colors duration-150"
                >
                  {/* Tanggal */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {formatDate(rec.date)}
                      </span>
                    </div>
                  </td>

                  {/* Karyawan (HR / Admin view) */}
                  {!isEmployee && (
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-slate-800">
                          {employeeName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {rec.employee?.employeeId} • {rec.employee?.department?.name || '-'}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Shift */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {shiftName}
                    </span>
                  </td>

                  {/* Jam Rencana */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-700 font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      {rec.plannedStartTime} - {rec.plannedEndTime}
                    </span>
                  </td>

                  {/* Jam Aktual */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {rec.actualStartTime && rec.actualEndTime ? (
                      <span className="font-mono text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                        {rec.actualStartTime} - {rec.actualEndTime}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Belum check-out
                      </span>
                    )}
                  </td>

                  {/* Durasi (Diajukan vs Disetujui) */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-xs">
                      <span className="text-slate-500">Diajukan: </span>
                      <span className="font-semibold text-slate-700">
                        {rec.requestedMinutes}m
                      </span>
                      {rec.approvedMinutes !== null && rec.approvedMinutes !== undefined && (
                        <div className="text-emerald-600 font-medium mt-0.5">
                          Disetujui: {rec.approvedMinutes}m
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(rec.status)}
                  </td>

                  {/* Aksi */}
                  <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(rec)}
                      className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detail
                    </Button>

                    {/* Employee can edit if PENDING */}
                    {isEmployee && rec.status === 'PENDING' && onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(rec)}
                        className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Ubah
                      </Button>
                    )}

                    {/* Employee can cancel if PENDING */}
                    {isEmployee && rec.status === 'PENDING' && onCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(rec)}
                        className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Batal
                      </Button>
                    )}

                    {/* HR / Admin Approve & Reject */}
                    {!isEmployee && rec.status === 'PENDING' && (
                      <>
                        {onApprove && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onApprove(rec)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Setujui
                          </Button>
                        )}
                        {onReject && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(rec)}
                            className="h-8 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Tolak
                          </Button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
