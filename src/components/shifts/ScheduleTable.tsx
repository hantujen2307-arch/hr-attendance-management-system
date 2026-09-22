'use client';

import React from 'react';
import { EmployeeScheduleRecord } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Calendar, Clock, Trash2, CalendarCheck } from 'lucide-react';

interface ScheduleTableProps {
  schedules: EmployeeScheduleRecord[];
  loading: boolean;
  onDeleteSchedule: (schedule: EmployeeScheduleRecord) => void;
  onAssignNew: () => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules,
  loading,
  onDeleteSchedule,
  onAssignNew,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse py-2">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 bg-slate-200 rounded" />
                <div className="h-2.5 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center">
        <Calendar className="h-10 w-10 text-slate-300 mb-3 stroke-1" />
        <h4 className="text-sm font-bold text-slate-800">Belum Ada Penugasan Jadwal Karyawan</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          Tugaskan shift operasional ke karyawan untuk mengatur roster kerja pada periode tanggal tertentu.
        </p>
        <Button variant="primary" size="sm" onClick={onAssignNew} className="gap-1.5">
          <CalendarCheck className="h-4 w-4" />
          Tugaskan Shift Karyawan
        </Button>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4">Nama Karyawan</th>
              <th className="py-3 px-3">NIP</th>
              <th className="py-3 px-3">Unit Kerja</th>
              <th className="py-3 px-4">Shift Ditugaskan</th>
              <th className="py-3 px-3">Tanggal Mulai</th>
              <th className="py-3 px-3">Tanggal Selesai</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((schedule, index) => {
              const isActive = schedule.status === 'ACTIVE';
              const empName = `${schedule.employee.firstName} ${schedule.employee.lastName}`;
              return (
                <tr
                  key={schedule.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    !isActive ? 'bg-slate-50/40 text-slate-400' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={empName} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 truncate">
                          {empName}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {schedule.employee.position || 'Staf'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-700">
                    {schedule.employee.employeeId}
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {schedule.employee.department?.name || 'Umum'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono border border-blue-200">
                          {schedule.shift.code || 'SFT'}
                        </span>
                        <span>{schedule.shift.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {schedule.shift.startTime} – {schedule.shift.endTime} WIB
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-800 font-medium">
                    {formatDate(schedule.startDate)}
                  </td>
                  <td className="py-3 px-3 text-slate-800 font-medium">
                    {formatDate(schedule.endDate)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge variant={isActive ? 'success' : 'neutral'} dot>
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSchedule(schedule)}
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Batalkan / Hapus Jadwal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1">Batalkan</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
