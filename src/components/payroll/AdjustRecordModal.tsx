'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle } from 'lucide-react';
import { PayrollRecord } from '@/types';

interface AdjustRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: PayrollRecord | null;
}

export const AdjustRecordModal: React.FC<AdjustRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  record,
}) => {
  const [allowances, setAllowances] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setAllowances(Number(record.allowances) || 0);
      setDeductions(Number(record.deductions) || 0);
      setNotes(record.notes || '');
      setErrorMsg(null);
    }
  }, [record]);

  if (!record) return null;

  const basicSalary = Number(record.basicSalary) || 0;
  const overtimePay = Number(record.overtimePay) || 0;
  const previewNet = Math.max(0, basicSalary + allowances + overtimePay - deductions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/payroll/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowances: Number(allowances),
          deductions: Number(deductions),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan penyesuaian');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penyesuaian Manual Slip Gaji"
      description={`Koreksi tunjangan dan potongan untuk ${record.employee?.firstName} ${record.employee?.lastName || ''}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-slate-800">
            {record.employee?.firstName} {record.employee?.lastName} ({record.employee?.employeeId})
          </p>
          <div className="grid grid-cols-2 gap-2 text-slate-600 mt-1">
            <span>Gaji Pokok: Rp {basicSalary.toLocaleString('id-ID')}</span>
            <span>Upah Lembur: Rp {overtimePay.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tunjangan Disesuaikan (Rp)
            </label>
            <Input
              type="number"
              min={0}
              step={10000}
              value={allowances}
              onChange={(e) => setAllowances(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Potongan Disesuaikan (Rp)
            </label>
            <Input
              type="number"
              min={0}
              step={10000}
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex justify-between items-center">
          <span className="font-semibold text-emerald-800">Estimasi Gaji Bersih Baru:</span>
          <span className="font-black text-emerald-700 text-sm">
            Rp {previewNet.toLocaleString('id-ID')}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Penyesuaian</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Contoh: Penyesuaian bonus lembur khusus..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Simpan Penyesuaian'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
