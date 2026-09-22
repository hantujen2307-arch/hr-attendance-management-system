'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ReimbursementRequest } from '@/types';
import { Wallet, AlertCircle } from 'lucide-react';

interface PayReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reimbursement: ReimbursementRequest | null;
}

export const PayReimbursementModal: React.FC<PayReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reimbursement,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reimbursement) return null;

  const payableAmount = reimbursement.approvedAmount ?? reimbursement.amount;
  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/reimbursements/${reimbursement.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses pembayaran reimbursement.');
      }

      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error paying reimbursement:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses pembayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          setNotes('');
          setError(null);
          onClose();
        }
      }}
      title="Konfirmasi Pembayaran Reimbursement"
      description="Tandai klaim ini sebagai sudah ditransfer / dicairkan kepada karyawan."
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
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
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
            <span className="text-slate-500">Total Pencairan:</span>
            <span className="font-bold text-lg text-emerald-600">
              {formatRupiah(payableAmount)}
            </span>
          </div>
        </div>

        {/* Payment reference / note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Referensi Transfer / Catatan Kasir (Opsional)
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            placeholder="Contoh: No. Ref Transfer BCA-98231 atau Pembayaran Kas Kecil..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setNotes('');
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            <Wallet className="w-4 h-4" />
            {isSubmitting ? 'Memproses...' : 'Konfirmasi Pencairan Selesai'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
