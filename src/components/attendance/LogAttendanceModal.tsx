'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface EmployeeOption {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

interface LogAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: {
    id: string;
    employeeId: string;
    employeeName: string;
    attendanceDate: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
    notes?: string | null;
  } | null;
}

export const LogAttendanceModal: React.FC<LogAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editRecord,
}) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [status, setStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE'>('PRESENT');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch employees list for dropdown
  useEffect(() => {
    if (!isOpen) return;
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data || [];
          setEmployees(list);
          if (list.length > 0 && !editRecord) {
            setSelectedEmployeeId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching employees for attendance modal:', err);
      }
    };
    fetchEmployees();
  }, [isOpen, editRecord]);

  // Extract time string HH:mm in WIB from ISO
  const extractWibTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    } catch {
      return '';
    }
  };

  // Populate when editing
  useEffect(() => {
    if (editRecord) {
      setSelectedEmployeeId(editRecord.employeeId);
      setDate(editRecord.attendanceDate.split('T')[0]);
      setCheckInTime(extractWibTime(editRecord.checkIn));
      setCheckOutTime(extractWibTime(editRecord.checkOut));
      setStatus(editRecord.status);
      setNotes(editRecord.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setCheckInTime('09:00');
      setCheckOutTime('17:00');
      setStatus('PRESENT');
      setNotes('');
    }
    setErrorMsg(null);
  }, [editRecord, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let isoCheckIn: string | undefined = undefined;
      let isoCheckOut: string | undefined = undefined;

      if (checkInTime && status !== 'ABSENT' && status !== 'LEAVE') {
        isoCheckIn = `${date}T${checkInTime}:00+07:00`;
      }

      if (checkOutTime && status !== 'ABSENT' && status !== 'LEAVE') {
        isoCheckOut = `${date}T${checkOutTime}:00+07:00`;
      }

      if (isoCheckIn && isoCheckOut) {
        const tIn = new Date(isoCheckIn).getTime();
        const tOut = new Date(isoCheckOut).getTime();
        if (tOut < tIn) {
          throw new Error('Check-out time cannot be earlier than check-in time');
        }
      }

      const isEdit = !!editRecord;
      const url = isEdit ? `/api/attendance/${editRecord.id}` : '/api/attendance';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = isEdit
        ? {
            checkIn: isoCheckIn,
            checkOut: isoCheckOut,
            status,
            notes: notes.trim() || undefined,
          }
        : {
            employeeId: selectedEmployeeId,
            attendanceDate: date,
            checkIn: isoCheckIn,
            checkOut: isoCheckOut,
            status,
            notes: notes.trim() || undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save attendance record');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'LEAVE', label: 'On Leave' },
  ];

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editRecord ? 'Edit Attendance Record' : 'Manual Attendance Entry'}
      description={
        editRecord
          ? `Modify attendance particulars for ${editRecord.employeeName}`
          : 'Log manual check-in, check-out, or status for an employee'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Employee Field */}
        {!editRecord ? (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <Select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              options={employeeOptions.length > 0 ? employeeOptions : [{ value: '', label: 'No employees found' }]}
              disabled={isLoading || employeeOptions.length === 0}
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Employee</label>
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 font-medium border border-slate-200">
              {editRecord.employeeName}
            </div>
          </div>
        )}

        {/* Attendance Date */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Attendance Date <span className="text-rose-500">*</span>
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isLoading || !!editRecord}
            required
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Status <span className="text-rose-500">*</span>
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            options={statusOptions}
            disabled={isLoading}
          />
        </div>

        {/* Check In & Check Out Times (hidden or disabled if Absent/Leave) */}
        {status !== 'ABSENT' && status !== 'LEAVE' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Check In (WIB)</label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Check Out (WIB)</label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for manual adjustment or coverage details..."
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            disabled={isLoading}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} disabled={isLoading}>
            {editRecord ? 'Save Changes' : 'Record Attendance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
