'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ReimbursementCategory } from '@/types';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CreateReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateReimbursementModal: React.FC<CreateReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState<ReimbursementCategory>('TRANSPORTATION');
  const [amount, setAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<'SUBMITTED' | 'DRAFT'>('SUBMITTED');

  // File upload state
  const [receiptFile, setReceiptFile] = useState<{
    dataUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCategory('TRANSPORTATION');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setStatus('SUBMITTED');
    setReceiptFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Ukuran file kwitansi maksimal 5 MB.');
      return;
    }

    // Validate type (JPG, PNG, WebP, PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format bukti pembayaran harus berupa JPG, PNG, WEBP, atau PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setReceiptFile({
        dataUrl,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
    };
    reader.onerror = () => {
      setError('Gagal membaca file bukti pembayaran.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      setError('Nominal biaya harus lebih dari 0.');
      return;
    }

    if (!expenseDate) {
      setError('Tanggal pengeluaran/kwitansi wajib diisi.');
      return;
    }

    if (!description.trim()) {
      setError('Deskripsi keperluan biaya wajib diisi.');
      return;
    }

    if (!receiptFile) {
      setError('Bukti pembayaran (struk/nota/kwitansi) wajib diunggah.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          amount: numericAmount,
          date: expenseDate,
          description: description.trim(),
          receipt: receiptFile.dataUrl,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengajukan reimbursement.');
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating reimbursement:', err);
      setError(err.message || 'Terjadi kesalahan sistem saat mengirim data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          resetForm();
          onClose();
        }
      }}
      title="Ajukan Reimbursement Biaya"
      description="Isi rincian pengeluaran operasional dan unggah bukti struk atau nota pembayaran."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Biaya <span className="text-red-500">*</span>
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReimbursementCategory)}
              options={[
                { value: 'TRANSPORTATION', label: 'Transportasi (BBM, Tol, Taksi)' },
                { value: 'MEALS', label: 'Makan / Konsumsi Lembur/Tamu' },
                { value: 'BUSINESS_TRIP', label: 'Perjalanan Dinas' },
                { value: 'OPERATIONAL', label: 'Operasional Kantor' },
                { value: 'MEDICAL', label: 'Kesehatan / Medis' },
                { value: 'OTHER', label: 'Lain-lain' },
              ]}
            />
          </div>

          {/* Expense Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Transaksi / Kwitansi <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nominal Biaya (Rp) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <Input
              type="text"
              placeholder="0"
              className="pl-9 font-semibold text-slate-800"
              value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '');
                setAmount(clean);
              }}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Deskripsi & Keperluan <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            placeholder="Jelaskan secara rinci tujuan dan keperluan pengeluaran..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bukti Pembayaran (Nota/Kwitansi/Invoice) <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileChange}
          />

          {!receiptFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-700">
                Klik untuk mengunggah bukti pembayaran
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Format: JPG, PNG, WebP, PDF (Maks. 5 MB)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                {receiptFile.mimeType.startsWith('image/') ? (
                  receiptFile.dataUrl ? (
                    <img
                      src={receiptFile.dataUrl}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded border border-slate-200"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                  )
                ) : (
                  <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center text-red-600">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[240px]">
                    {receiptFile.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(receiptFile.fileSize / 1024).toFixed(1)} KB &bull; {receiptFile.mimeType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReceiptFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                title="Hapus file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Status Mode (DRAFT vs SUBMITTED) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <label className="text-xs text-slate-600">Status Pengajuan:</label>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="statusOption"
                checked={status === 'SUBMITTED'}
                onChange={() => setStatus('SUBMITTED')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800">Ajukan ke HR (SUBMITTED)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="statusOption"
                checked={status === 'DRAFT'}
                onChange={() => setStatus('DRAFT')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-600">Simpan DRAFT</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting
              ? 'Menyimpan...'
              : status === 'SUBMITTED'
                ? 'Kirim Pengajuan'
                : 'Simpan DRAFT'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
