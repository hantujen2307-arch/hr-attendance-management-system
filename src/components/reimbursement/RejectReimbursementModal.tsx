'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ReimbursementRequest } from '@/types';
import { XCircle, AlertCircle } from 'lucide-react';

interface RejectReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reimbursement: ReimbursementRequest | null;
}

export const RejectReimbursementModal: React.FC<RejectReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reimbursement,
}) => {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reimbursement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Alasan penolakan wajib diisi agar karyawan memahami penyebabnya.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reimbursements/${reimbursement.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menolak pengajuan reimbursement.');
      }

      setReason('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error rejecting reimbursement:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses penolakan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          setReason('');
          setError(null);
          onClose();
        }
      }}
      title="Tolak Pengajuan Reimbursement"
      description="Pengajuan akan ditolak dan karyawan akan menerima notifikasi beserta alasan penolakan."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Info card */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">No. Pengajuan:</span>
            <span className="font-semibold text-slate-800">
              {reimbursement.reimbursementNo || reimbursement.reimbursementNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Karyawan:</span>
            <span className="font-semibold text-slate-800">
              {reimbursement.employee?.name ||
                `${reimbursement.employee?.firstName || ''} ${reimbursement.employee?.lastName || ''}`.trim() ||
                '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Nominal:</span>
            <span className="font-semibold text-slate-800">
              Rp {reimbursement.amount.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Alasan Penolakan <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-900 placeholder:text-slate-400"
            placeholder="Contoh: Bukti nota tidak terbaca / tidak sesuai kebijakan operasional..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReason('');
              setError(null);
              onClose();
            }}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            {isSubmitting ? 'Memproses...' : 'Tolak Pengajuan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
