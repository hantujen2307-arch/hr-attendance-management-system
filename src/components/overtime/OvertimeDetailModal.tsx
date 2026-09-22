'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Clock,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { OvertimeRecord } from '@/types';

interface OvertimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OvertimeRecord | null;
}

export const OvertimeDetailModal: React.FC<OvertimeDetailModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!record) return null;

  const employeeName = record.employee
    ? `${record.employee.firstName} ${record.employee.lastName}`
    : 'Karyawan';

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(d) + ' WIB';
    } catch {
      return ts;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Pengajuan Lembur">
      <div className="space-y-4 text-sm text-slate-700">
        {/* Header Profil Karyawan */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
              {record.employee?.firstName?.[0] || 'K'}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{employeeName}</div>
              <div className="text-xs text-slate-500">
                {record.employee?.employeeId} • {record.employee?.department?.name || 'Departemen Umum'}
              </div>
            </div>
          </div>
          <div>
            {record.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Disetujui
              </span>
            )}
            {record.status === 'PENDING' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Menunggu
              </span>
            )}
            {record.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Ditolak
              </span>
            )}
            {record.status === 'CANCELLED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Ban className="w-3.5 h-3.5 text-slate-500" />
                Dibatalkan
              </span>
            )}
          </div>
        </div>

        {/* Informasi Jadwal & Shift */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Tanggal Lembur</span>
            <span className="font-semibold text-slate-800">
              {formatDate(record.date)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Shift Kerja</span>
            <span className="font-semibold text-slate-800">
              {record.schedule?.shift?.name || 'Shift Reguler'}
            </span>
          </div>
        </div>

        {/* Waktu Lembur & Durasi */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <span className="text-xs text-indigo-700 font-medium block mb-1">
              Rencana Lembur (Planned)
            </span>
            <div className="font-mono text-base font-bold text-indigo-950">
              {record.plannedStartTime} - {record.plannedEndTime}
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              Durasi diajukan: <span className="font-semibold">{record.requestedMinutes} Menit</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <span className="text-xs text-emerald-700 font-medium block mb-1">
              Realisasi Aktual (Absensi)
            </span>
            <div className="font-mono text-base font-bold text-emerald-950">
              {record.actualStartTime && record.actualEndTime
                ? `${record.actualStartTime} - ${record.actualEndTime}`
                : '-'}
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              {record.actualMinutes !== null && record.actualMinutes !== undefined
                ? `Durasi aktual: ${record.actualMinutes} Menit`
                : 'Belum terverifikasi check-out'}
            </div>
          </div>
        </div>

        {/* Menit Disetujui (Jika Approved) */}
        {record.status === 'APPROVED' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Durasi Lembur Disetujui HR:</span>
            </div>
            <div className="font-bold text-emerald-900 text-base">
              {record.approvedMinutes} Menit ({Math.floor((record.approvedMinutes || 0) / 60)} Jam {(record.approvedMinutes || 0) % 60} Menit)
            </div>
          </div>
        )}

        {/* Alasan Lembur */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Alasan / Pekerjaan Lembur
          </span>
          <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {record.reason}
          </p>
        </div>

        {/* Catatan Karyawan */}
        {record.notes && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Catatan Karyawan
            </span>
            <p className="text-xs text-slate-800 whitespace-pre-wrap">
              {record.notes}
            </p>
          </div>
        )}

        {/* Alasan Penolakan (Jika Rejected) */}
        {record.status === 'REJECTED' && record.rejectedReason && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs mb-1">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Alasan Penolakan dari HR/Admin</span>
            </div>
            <p className="text-xs text-rose-700 whitespace-pre-wrap">
              {record.rejectedReason}
            </p>
          </div>
        )}

        {/* Informasi Approval */}
        {record.approver && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Diverifikasi Oleh:</span>
              <span className="font-medium text-slate-800">{record.approver.email} ({record.approver.role})</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu Verifikasi:</span>
              <span className="font-medium text-slate-800">{formatTimestamp(record.approvedAt)}</span>
            </div>
          </div>
        )}

        {/* Tombol Tutup */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs h-9"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
