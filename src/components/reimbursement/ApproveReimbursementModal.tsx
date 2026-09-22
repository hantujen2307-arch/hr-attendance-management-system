'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ReimbursementRequest } from '@/types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ApproveReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reimbursement: ReimbursementRequest | null;
}

export const ApproveReimbursementModal: React.FC<ApproveReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reimbursement,
}) => {
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reimbursement) {
      setApprovedAmount(reimbursement.amount.toString());
      setNotes('');
      setError(null);
    }
  }, [reimbursement]);

  if (!reimbursement) return null;

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(approvedAmount.replace(/[^0-9]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      setError('Nominal yang disetujui harus lebih dari 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reimbursements/${reimbursement.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedAmount: numericAmount,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyetujui pengajuan reimbursement.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error approving reimbursement:', err);
      setError(err.message || 'Terjadi kesalahan sistem saat menyetujui pengajuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Persetujuan Reimbursement"
      description="Verifikasi bukti pengeluaran dan tentukan nominal yang disetujui untuk penggantian."
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
                `${reimbursement.employee?.firstName || ''} ${reimbursement.employee?.lastName || ''}`.trim()}{' '}
              ({reimbursement.employee?.employeeId})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kategori:</span>
            <span className="font-semibold text-slate-800">{reimbursement.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Nominal Diajukan:</span>
            <span className="font-bold text-blue-600">{formatRupiah(reimbursement.amount)}</span>
          </div>
        </div>

        {/* Approved Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nominal yang Disetujui (Rp) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <Input
              type="text"
              placeholder="0"
              className="pl-9 font-semibold text-slate-800"
              value={
                approvedAmount
                  ? Number(approvedAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID')
                  : ''
              }
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '');
                setApprovedAmount(clean);
              }}
              required
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Dapat disesuaikan jika dilakukan persetujuan sebagian (partial approval).
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Persetujuan (Opsional)
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder:text-slate-400"
            placeholder="Catatan verifikasi atau penyesuaian nominal..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Memproses...' : 'Setujui Reimbursement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
