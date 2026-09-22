'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ShiftMasterRecord } from '@/types';
import { AlertCircle, CalendarCheck, Clock, Users } from 'lucide-react';

interface EmployeeOption {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: { name: string };
  position?: string;
}

interface AssignShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shifts: ShiftMasterRecord[];
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

export const AssignShiftModal: React.FC<AssignShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  shifts,
}) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [notes, setNotes] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default dates: first day of current month to end of current month
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${y}-${m}-01`;
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
      setErrorMessage(null);
      fetchEmployees();
    }
  }, [isOpen]);

  // Set initial selected shift
  useEffect(() => {
    const activeShifts = shifts.filter((s) => s.status === 'ACTIVE');
    if (activeShifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(activeShifts[0].id);
      if (activeShifts[0].workDays) {
        setSelectedDays(activeShifts[0].workDays.split(','));
      }
    }
  }, [shifts, selectedShiftId]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await fetch('/api/employees?status=ACTIVE');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setEmployees(list);
        if (list.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching employees for assignment:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleShiftSelectChange = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    const chosen = shifts.find((s) => s.id === shiftId);
    if (chosen?.workDays) {
      setSelectedDays(chosen.workDays.split(','));
    }
  };

  const toggleDay = (dayVal: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedEmployeeId) {
      setErrorMessage('Pilih karyawan yang akan ditugaskan');
      return;
    }
    if (!selectedShiftId) {
      setErrorMessage('Pilih shift yang akan diberikan');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Tanggal mulai dan selesai wajib diisi');
      return;
    }
    if (startDate > endDate) {
      setErrorMessage('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/shifts/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          shiftId: selectedShiftId,
          startDate,
          endDate,
          workDays: selectedDays.join(','),
          notes: notes.trim() || undefined,
          setAsDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Backend conflict check or validation error
        throw new Error(data.message || 'Gagal menyimpan penugasan shift');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  };

  const activeShifts = shifts.filter((s) => s.status === 'ACTIVE');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penugasan Jadwal Shift Karyawan"
      description="Tentukan jadwal kerja operasional untuk pegawai pada rentang tanggal tertentu"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Validasi Penugasan Gagal</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Employee Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Pilih Karyawan
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            disabled={loadingEmployees}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            required
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeId}) — {emp.department?.name || 'Umum'} {emp.position ? `• ${emp.position}` : ''}
              </option>
            ))}
          </select>
          {loadingEmployees && (
            <span className="text-[11px] text-slate-400 mt-1 block">Memuat data karyawan...</span>
          )}
        </div>

        {/* Shift Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Pilih Shift Operasional (Aktif)
          </label>
          <select
            value={selectedShiftId}
            onChange={(e) => handleShiftSelectChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            required
          >
            {activeShifts.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.code || 'SFT'}] {s.name} ({s.startTime} - {s.endTime} WIB) {s.isOvernight ? '🌙 Overnight' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range: Start and End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="Tanggal Selesai"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Working Days */}
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

        <Input
          label="Catatan / Keterangan Penugasan"
          placeholder="Contoh: Roster penugasan bulan September tim operasional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800">Jadikan Shift Default Pegawai</p>
            <p className="text-[11px] text-slate-500">
              Otomatis jadikan shift ini sebagai jadwal default tetap karyawan
            </p>
          </div>
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="gap-1.5">
            <CalendarCheck className="h-4 w-4" />
            {submitting ? 'Menyimpan...' : 'Simpan Penugasan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
