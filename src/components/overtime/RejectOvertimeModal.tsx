'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { XCircle, AlertCircle } from 'lucide-react';
import { OvertimeRecord } from '@/types';

interface RejectOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OvertimeRecord | null;
  onSuccess: () => void;
}

export const RejectOvertimeModal: React.FC<RejectOvertimeModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const [rejectedReason, setRejectedReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setRejectedReason('');
      setErrorMessage(null);
    }
  }, [record]);

  if (!record) return null;

  const employeeName = record.employee
    ? `${record.employee.firstName} ${record.employee.lastName}`
    : 'Karyawan';

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!rejectedReason || rejectedReason.trim().length < 3) {
      setErrorMessage('Alasan penolakan lembur wajib diisi (minimal 3 karakter).');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/overtime/${record.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedReason: rejectedReason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal menolak pengajuan lembur.');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Tolak Pengajuan Lembur">
      <form onSubmit={handleReject} className="space-y-4 text-sm text-slate-700">
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
        </div>

        {/* Input Alasan Penolakan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Alasan Penolakan <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={rejectedReason}
            onChange={(e) => setRejectedReason(e.target.value)}
            required
            rows={3}
            placeholder="Jelaskan alasan pengajuan lembur ini tidak dapat disetujui..."
            className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Alasan penolakan akan dicatat dan dikirimkan sebagai notifikasi kepada karyawan.
          </p>
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
            className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <XCircle className="w-4 h-4 mr-1" />
            {loading ? 'Menolak...' : 'Tolak Lembur'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
