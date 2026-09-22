'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ShiftMasterRecord } from '@/types';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface DeactivateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shift: ShiftMasterRecord | null;
  mode: 'deactivate' | 'activate';
}

export const DeactivateShiftModal: React.FC<DeactivateShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  shift,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!shift) return null;

  const isDeactivate = mode === 'deactivate';

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const endpoint = isDeactivate
        ? `/api/shifts/${shift.id}/deactivate`
        : `/api/shifts/${shift.id}/activate`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Gagal ${isDeactivate ? 'menonaktifkan' : 'mengaktifkan'} shift`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeactivate ? 'Konfirmasi Nonaktifkan Shift' : 'Konfirmasi Aktifkan Kembali Shift'}
      description={
        isDeactivate
          ? 'Shift yang dinonaktifkan tidak akan dapat diberikan pada penugasan jadwal baru'
          : 'Shift akan dapat kembali dipilih dan ditugaskan ke jadwal kerja karyawan'
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Nama Shift:</span>
            <span className="text-sm font-bold text-slate-900">{shift.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Kode Shift:</span>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {shift.code}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Jam Kerja:</span>
            <span className="text-xs font-semibold text-slate-800">
              {shift.startTime} – {shift.endTime} WIB
            </span>
          </div>
        </div>

        {isDeactivate ? (
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Perhatian Sistem (Integritas Data):
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-700">
              <li>Shift ini <strong>tidak dapat dipilih</strong> pada form penugasan jadwal baru.</li>
              <li>Seluruh riwayat presensi dan jadwal lama <strong>tetap tersimpan utuh</strong>.</li>
              <li>Data histori absensi tidak akan terhapus atau rusak.</li>
            </ul>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Shift ini akan segera muncul kembali di pilihan assignment jadwal karyawan.</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            type="button"
            variant={isDeactivate ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? 'Memproses...'
              : isDeactivate
              ? 'Ya, Nonaktifkan Shift'
              : 'Ya, Aktifkan Shift'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
