'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LeaveType } from '@/types';

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLeave: (request: any) => void;
  userRole?: string;
}

export const RequestLeaveModal: React.FC<RequestLeaveModalProps> = ({
  isOpen,
  onClose,
  onSubmitLeave,
  userRole = 'EMPLOYEE',
}) => {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<any[]>([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const user = json.data || json;
        if (user.employee) {
          setEmployeeData(user.employee);
          const name = `${user.employee.firstName || ''} ${user.employee.lastName || ''}`.trim();
          if (name) setEmployeeName(name);
        } else if (user.email) {
          setEmployeeName(user.email.split('@')[0]);
        }
      })
      .catch(() => {});

    // Fetch leave types
    fetch('/api/leave/types')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableLeaveTypes(data);
          setSelectedLeaveTypeId(data[0].id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Helper to compute local date in YYYY-MM-DD format in Asia/Jakarta timezone
  const getTodayDateString = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const todayStr = getTodayDateString();

  // Helper to calculate duration in calendar days (inclusive)
  const calculateDuration = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const sUtc = Date.UTC(sy, sm - 1, sd);
    const eUtc = Date.UTC(ey, em - 1, ed);
    if (eUtc < sUtc) return 0;
    return Math.round((eUtc - sUtc) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setErrorMsg(null);
    if (endDate && endDate < val) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Check empty dates
    if (!startDate || !startDate.trim()) {
      setErrorMsg('Tanggal mulai wajib diisi.');
      return;
    }
    if (!endDate || !endDate.trim()) {
      setErrorMsg('Tanggal selesai wajib diisi.');
      return;
    }
    if (!reason || !reason.trim()) {
      setErrorMsg('Alasan / keperluan cuti wajib diisi.');
      return;
    }

    // 2. Strict format check YYYY-MM-DD
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      setErrorMsg('Format tanggal tidak valid. Gunakan format YYYY-MM-DD.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // 3. Date validation rules:
    // - Hari ini valid (startDate === todayStr)
    // - Masa depan valid (startDate > todayStr)
    // - Masa lalu ditolak (startDate < todayStr)
    if (startDate < todayStr) {
      setErrorMsg(
        `Tanggal mulai pengajuan (${startDate}) tidak boleh di masa lalu. Anda dapat mengajukan izin/cuti untuk hari ini (${todayStr}) atau tanggal mendatang.`
      );
      setIsSubmitting(false);
      return;
    }

    // 4. Reject if endDate is before startDate
    if (endDate < startDate) {
      setErrorMsg('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      setIsSubmitting(false);
      return;
    }

    const duration = calculateDuration(startDate, endDate);
    if (duration <= 0) {
      setErrorMsg('Rentang tanggal pengajuan tidak valid.');
      setIsSubmitting(false);
      return;
    }

    const effectiveTypeId = selectedLeaveTypeId || availableLeaveTypes[0]?.id;
    if (!effectiveTypeId) {
      setErrorMsg('Jenis cuti/izin belum dipilih atau sedang dimuat.');
      setIsSubmitting(false);
      return;
    }

    const matchedType = availableLeaveTypes.find((t) => t.id === effectiveTypeId);

    const payload = {
      employeeId: employeeData?.id || undefined,
      leaveTypeId: effectiveTypeId,
      leaveType: (matchedType?.name || 'Annual Leave') as LeaveType,
      startDate,
      endDate,
      duration,
      reason: reason.trim(),
    };

    try {
      await onSubmitLeave(payload);
      onClose();
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim pengajuan cuti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveTypeOptions =
    availableLeaveTypes.length > 0
      ? availableLeaveTypes.map((t) => ({
          value: t.id,
          label: `${t.name} (${t.maxDays ? `${t.maxDays} hari` : 'Izin'})`,
        }))
      : [
          { value: 'annual', label: 'Annual Leave / Cuti Tahunan' },
          { value: 'sick', label: 'Sick Leave / Izin Sakit' },
          { value: 'casual', label: 'Casual Leave / Izin Keperluan Pribadi' },
          { value: 'unpaid', label: 'Unpaid Leave / Cuti Tanpa Gaji' },
        ];

  const estimatedDays = calculateDuration(startDate, endDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Pengajuan Cuti / Izin"
      description="Ajukan permohonan cuti tahunan, izin sakit hari ini, atau izin ketidakhadiran"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Employee Name (Readonly for employee) */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Karyawan Pemohon
          </label>
          <input
            type="text"
            readOnly
            value={employeeName ? `${employeeName} ${employeeData?.employeeId ? `(${employeeData.employeeId})` : ''}` : 'Memuat data...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 cursor-not-allowed"
          />
        </div>

        {/* Leave Type */}
        <Select
          label="Jenis Cuti / Izin"
          value={selectedLeaveTypeId}
          onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
          options={leaveTypeOptions}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            min={todayStr}
            onChange={(e) => handleStartDateChange(e.target.value)}
            required
          />

          <Input
            label="Tanggal Selesai"
            type="date"
            value={endDate}
            min={startDate || todayStr}
            onChange={(e) => handleEndDateChange(e.target.value)}
            required
          />
        </div>

        {/* Duration preview badge */}
        {startDate && endDate && estimatedDays > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800">
            <span className="font-medium">Estimasi Durasi Izin/Cuti:</span>
            <span className="font-bold text-blue-900 bg-white px-2.5 py-0.5 rounded border border-blue-200 shadow-2xs">
              {estimatedDays} Hari Kerja
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700 select-none">
            Alasan / Keperluan Cuti
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            placeholder="Jelaskan alasan atau keperluan pengajuan izin Anda..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

