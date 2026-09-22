'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle2, AlertCircle, Clock, User } from 'lucide-react';
import { OvertimeRecord } from '@/types';

interface ApproveOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OvertimeRecord | null;
  onSuccess: () => void;
}

export const ApproveOvertimeModal: React.FC<ApproveOvertimeModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const [approvedMinutes, setApprovedMinutes] = useState<number>(120);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setApprovedMinutes(record.requestedMinutes || 60);
      setNotes('');
      setErrorMessage(null);
    }
  }, [record]);

  if (!record) return null;

  const employeeName = record.employee
    ? `${record.employee.firstName} ${record.employee.lastName}`
    : 'Karyawan';

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!approvedMinutes || approvedMinutes <= 0) {
      setErrorMessage('Menit lembur yang disetujui harus lebih dari 0.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/overtime/${record.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedMinutes: Number(approvedMinutes),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal menyetujui lembur.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Persetujuan Lembur (Approve)">
      <form onSubmit={handleApprove} className="space-y-4 text-sm text-slate-700">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Karyawan:</span>
            <span className="font-semibold text-slate-800">{employeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tanggal Lembur:</span>
            <span className="font-medium text-slate-800">{record.date.split('T')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Rencana Jam:</span>
            <span className="font-mono font-medium text-slate-800">
              {record.plannedStartTime} - {record.plannedEndTime} ({record.requestedMinutes} Menit)
            </span>
          </div>
          {record.actualStartTime && record.actualEndTime && (
            <div className="flex justify-between text-emerald-700">
              <span>Jam Aktual Absensi:</span>
              <span className="font-mono font-medium">
                {record.actualStartTime} - {record.actualEndTime} ({record.actualMinutes}m)
              </span>
            </div>
          )}
        </div>

        {/* Input Menit Lembur yang Disetujui */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Menit Lembur yang Disetujui (Approved Minutes) <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={1440}
              value={approvedMinutes}
              onChange={(e) => setApprovedMinutes(Number(e.target.value))}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {Math.floor(approvedMinutes / 60)} Jam {approvedMinutes % 60} Menit
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            HR/Admin dapat mengoreksi menit lembur yang sah untuk penggajian.
          </p>
        </div>

        {/* Catatan Persetujuan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Persetujuan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Disetujui sesuai target penutupan buku"
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs h-9"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {loading ? 'Menyetujui...' : 'Setujui Lembur'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
