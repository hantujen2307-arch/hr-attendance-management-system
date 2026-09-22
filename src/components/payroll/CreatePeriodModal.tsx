'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Calendar, AlertCircle } from 'lucide-react';

interface CreatePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePeriodModal: React.FC<CreatePeriodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Helper to format YYYY-MM-DD
  const formatIsoDate = (y: number, m: number, d: number) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

  const [month, setMonth] = useState<number>(currentMonth);
  const [year, setYear] = useState<number>(currentYear);
  const [name, setName] = useState<string>(`Gaji ${monthNames[currentMonth - 1]} ${currentYear}`);
  const [startDate, setStartDate] = useState<string>(formatIsoDate(currentYear, currentMonth, 1));
  const [endDate, setEndDate] = useState<string>(formatIsoDate(currentYear, currentMonth, lastDayOfMonth));
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    setName(`Gaji ${monthNames[newMonth - 1]} ${year}`);
    const lastDay = new Date(year, newMonth, 0).getDate();
    setStartDate(formatIsoDate(year, newMonth, 1));
    setEndDate(formatIsoDate(year, newMonth, lastDay));
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setName(`Gaji ${monthNames[month - 1]} ${newYear}`);
    const lastDay = new Date(newYear, month, 0).getDate();
    setStartDate(formatIsoDate(newYear, month, 1));
    setEndDate(formatIsoDate(newYear, month, lastDay));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          month: Number(month),
          year: Number(year),
          startDate,
          endDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat periode payroll');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Periode Penggajian Baru"
      description="Buat jadwal periode penggajian bulanan untuk cut-off kehadiran dan perhitungan gaji."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan</label>
            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {monthNames.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {idx + 1} - {mName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun</label>
            <input
              type="number"
              min={2020}
              max={2035}
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Periode</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Gaji September 2026"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Mulai Cut-Off
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Akhir Cut-Off
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Catatan tambahan untuk periode ini..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Simpan Periode (DRAFT)'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
