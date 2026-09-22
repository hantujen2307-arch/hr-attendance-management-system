'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Clock, Moon, Sun } from 'lucide-react';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_OPTIONS = [
  { value: '1', label: 'Senin' },
  { value: '2', label: 'Selasa' },
  { value: '3', label: 'Rabu' },
  { value: '4', label: 'Kamis' },
  { value: '5', label: 'Jumat' },
  { value: '6', label: 'Sabtu' },
  { value: '7', label: 'Minggu' },
];

export const AddShiftModal: React.FC<AddShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [toleranceMinutes, setToleranceMinutes] = useState(15);
  const [isOvernight, setIsOvernight] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleDay = (dayVal: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal].sort()
    );
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    // Auto-detect overnight if start > end
    if (val && endTime && val > endTime) {
      setIsOvernight(true);
    }
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    // Auto-detect overnight if start > end
    if (startTime && val && startTime > val) {
      setIsOvernight(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Nama Shift wajib diisi');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Kode Shift wajib diisi');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage('Jam Masuk dan Jam Pulang wajib diisi');
      return;
    }
    if (toleranceMinutes < 0) {
      setErrorMessage('Toleransi keterlambatan minimal 0 menit');
      return;
    }
    if (breakMinutes < 0) {
      setErrorMessage('Durasi istirahat minimal 0 menit');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          startTime,
          endTime,
          breakMinutes: Number(breakMinutes),
          toleranceMinutes: Number(toleranceMinutes),
          isOvernight,
          workDays: selectedDays.join(','),
          description: description.trim() || undefined,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menambahkan shift baru');
      }

      onSuccess();
      onClose();
      // Reset form
      setName('');
      setCode('');
      setStartTime('08:00');
      setEndTime('17:00');
      setBreakMinutes(60);
      setToleranceMinutes(15);
      setIsOvernight(false);
      setSelectedDays(['1', '2', '3', '4', '5']);
      setDescription('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Shift Baru"
      description="Konfigurasikan jam kerja operasional, batas toleransi, dan roster kerja tim"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Nama Shift"
              placeholder="Contoh: Shift Pagi Operasional"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code && e.target.value) {
                  setCode(e.target.value.substring(0, 3).toUpperCase());
                }
              }}
              required
            />
          </div>

          <div>
            <Input
              label="Kode Shift"
              placeholder="PGI"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              className="uppercase font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Jam Masuk"
            type="time"
            value={startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            required
          />

          <Input
            label="Jam Pulang"
            type="time"
            value={endTime}
            onChange={(e) => handleEndTimeChange(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Durasi Istirahat (Menit)"
            type="number"
            min={0}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            placeholder="60"
            required
          />

          <Input
            label="Toleransi Keterlambatan (Menit)"
            type="number"
            min={0}
            value={toleranceMinutes}
            onChange={(e) => setToleranceMinutes(Number(e.target.value))}
            placeholder="15"
            required
          />
        </div>

        {/* Overnight toggle */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isOvernight ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
              {isOvernight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Shift Malam / Lintas Hari (Overnight)</p>
              <p className="text-[11px] text-slate-500">
                Aktifkan jika jam kerja melewati tengah malam (misal 22:00 s/d 06:00 WIB)
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isOvernight}
              onChange={(e) => setIsOvernight(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Working Days Checklist */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1.5">
            Hari Kerja Berlaku
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {DAYS_OPTIONS.map((day) => {
              const isChecked = selectedDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center ${
                    isChecked
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Keterangan / Deskripsi (Opsional)"
            placeholder="Catatan operasional shift"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Select
            label="Status Awal"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            options={[
              { value: 'ACTIVE', label: 'Aktif (Dapat Ditugaskan)' },
              { value: 'INACTIVE', label: 'Nonaktif' },
            ]}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
            <Clock className="h-4 w-4" />
            {loading ? 'Menyimpan...' : 'Simpan Shift'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
