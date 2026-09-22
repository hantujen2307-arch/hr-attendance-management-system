'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Clock, Calendar, FileText } from 'lucide-react';
import { OvertimeRecord } from '@/types';

interface EditOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OvertimeRecord | null;
  onSuccess: () => void;
}

export const EditOvertimeModal: React.FC<EditOvertimeModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const [date, setDate] = useState('');
  const [plannedStartTime, setPlannedStartTime] = useState('17:00');
  const [plannedEndTime, setPlannedEndTime] = useState('19:00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize form when record changes
  useEffect(() => {
    if (record) {
      const dateStr = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
      setDate(dateStr);
      setPlannedStartTime(record.plannedStartTime || '17:00');
      setPlannedEndTime(record.plannedEndTime || '19:00');
      setReason(record.reason || '');
      setNotes(record.notes || '');
      setErrorMessage(null);
    }
  }, [record]);

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
    if (!record) return;

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
      const response = await fetch(`/api/overtime/${record.id}`, {
        method: 'PATCH',
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
        throw new Error(data.message || 'Gagal memperbarui pengajuan lembur.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan pada sistem.');
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ubah Pengajuan Lembur">
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Jam Mulai & Jam Selesai */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Mulai Rencana <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={plannedStartTime}
              onChange={(e) => setPlannedStartTime(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Selesai Rencana <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={plannedEndTime}
              onChange={(e) => setPlannedEndTime(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Preview Durasi */}
        {calculatedDuration && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-medium text-slate-700">
                Estimasi Durasi Lembur:
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-indigo-900 font-mono">
                {calculatedDuration.text} ({calculatedDuration.totalMinutes} menit)
              </span>
              {calculatedDuration.isOvernight && (
                <span className="block text-[10px] text-amber-600 font-medium">
                  🌙 Melewati tengah malam (+1 hari)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Alasan Lembur */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Alasan Lembur <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan tugas atau pekerjaan yang dikerjakan saat lembur..."
            required
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Catatan Tambahan (Opsional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referensi tiket, nomor tugas, atau instruksi..."
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
