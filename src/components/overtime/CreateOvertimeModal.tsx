'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Clock, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface CreateOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOvertimeModal: React.FC<CreateOvertimeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [plannedStartTime, setPlannedStartTime] = useState('17:00');
  const [plannedEndTime, setPlannedEndTime] = useState('19:00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate live preview of duration in minutes and hours
  const calculatedDuration = useMemo(() => {
    try {
      const [sH, sM] = plannedStartTime.split(':').map((v) => parseInt(v, 10));
      const [eH, eM] = plannedEndTime.split(':').map((v) => parseInt(v, 10));

      if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return null;

      let diff = eH * 60 + eM - (sH * 60 + sM);
      let isOvernight = false;

      if (diff < 0) {
        diff += 1440;
        isOvernight = true;
      }

      const hours = Math.floor(diff / 60);
      const mins = diff % 60;

      let text = '';
      if (hours > 0 && mins > 0) text = `${hours} jam ${mins} menit`;
      else if (hours > 0) text = `${hours} jam`;
      else text = `${mins} menit`;

      return { totalMinutes: diff, text, isOvernight };
    } catch {
      return null;
    }
  }, [plannedStartTime, plannedEndTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!date) {
      setErrorMessage('Tanggal lembur wajib diisi.');
      return;
    }

    if (!plannedStartTime || !plannedEndTime) {
      setErrorMessage('Jam mulai dan jam selesai lembur wajib diisi.');
      return;
    }

    if (!reason || reason.trim().length < 3) {
      setErrorMessage('Alasan lembur wajib diisi minimal 3 karakter.');
      return;
    }

    if (calculatedDuration && calculatedDuration.totalMinutes <= 0) {
      setErrorMessage('Durasi lembur harus lebih dari 0 menit.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          plannedStartTime,
          plannedEndTime,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengajukan permohonan lembur.');
      }

      // Reset form
      setReason('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan pada sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajukan Lembur (Overtime)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tanggal Lembur */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Lembur <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Jam Mulai & Jam Selesai */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Mulai (HH:mm) <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={plannedStartTime}
              onChange={(e) => setPlannedStartTime(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Selesai (HH:mm) <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={plannedEndTime}
              onChange={(e) => setPlannedEndTime(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Live Duration Preview */}
        {calculatedDuration && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-700">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">Durasi Rencana Lembur:</span>
            </div>
            <div className="font-semibold text-indigo-900">
              {calculatedDuration.totalMinutes} Menit ({calculatedDuration.text})
              {calculatedDuration.isOvernight && (
                <span className="ml-1 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Lintas Hari
                </span>
              )}
            </div>
          </div>
        )}

        {/* Alasan Lembur */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Alasan / Pekerjaan Lembur <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Jelaskan secara ringkas target atau tugas lembur..."
            className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Catatan Tambahan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Sudah konfirmasi ke supervisor tim"
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
