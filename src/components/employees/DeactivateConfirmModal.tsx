'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmployeeRecord } from '@/types';
import { UserX, UserCheck, AlertTriangle } from 'lucide-react';

interface DeactivateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: EmployeeRecord | null;
  mode: 'deactivate' | 'activate';
}

export const DeactivateConfirmModal: React.FC<DeactivateConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
  mode,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const isDeactivating = mode === 'deactivate';

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const endpoint = isDeactivating
        ? `/api/employees/${employee.id}/deactivate`
        : `/api/employees/${employee.id}/activate`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Gagal memproses status karyawan');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error changing employee status:', err);
      setError('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeactivating ? 'Konfirmasi Nonaktifkan Karyawan' : 'Konfirmasi Aktifkan Kembali'}
      description={`Pengubahan status kepegawaian untuk ${fullName} (${employee.employeeId})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDeactivating ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {isDeactivating ? (
              <UserX className="h-5 w-5" />
            ) : (
              <UserCheck className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="font-semibold text-slate-900">
              {isDeactivating
                ? `Apakah Anda yakin ingin menonaktifkan karyawan "${fullName}"?`
                : `Apakah Anda yakin ingin mengaktifkan kembali karyawan "${fullName}"?`}
            </p>
            {isDeactivating ? (
              <ul className="list-disc pl-4 space-y-1 text-slate-500 text-xs pt-1">
                <li>Karyawan tidak akan dihitung dalam statistik karyawan aktif.</li>
                <li>Karyawan tidak akan muncul pada daftar "Belum Absen".</li>
                <li>Karyawan tidak dapat melakukan absensi baru maupun pengajuan baru.</li>
                <li>
                  <strong className="text-slate-700">
                    Seluruh riwayat absensi, cuti, dan log audit tetap tersimpan aman.
                  </strong>
                </li>
              </ul>
            ) : (
              <p className="text-xs text-slate-500 pt-1">
                Setelah diaktifkan kembali, karyawan dapat melakukan absensi dan pengajuan seperti biasa.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="button"
            variant={isDeactivating ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={submitting}
            className="gap-1.5"
          >
            {submitting
              ? 'Memproses...'
              : isDeactivating
              ? 'Ya, Nonaktifkan'
              : 'Ya, Aktifkan Kembali'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
