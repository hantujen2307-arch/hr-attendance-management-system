'use client';

import React from 'react';
import { ShiftMasterRecord } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  Edit2,
  PowerOff,
  Power,
  Moon,
  Sun,
  Coffee,
  Calendar,
  Users,
} from 'lucide-react';

interface ShiftTableProps {
  shifts: ShiftMasterRecord[];
  loading: boolean;
  onEdit: (shift: ShiftMasterRecord) => void;
  onDeactivate: (shift: ShiftMasterRecord) => void;
  onActivate: (shift: ShiftMasterRecord) => void;
  onAddNew: () => void;
}

export const ShiftTable: React.FC<ShiftTableProps> = ({
  shifts,
  loading,
  onEdit,
  onDeactivate,
  onActivate,
  onAddNew,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse py-2">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-slate-200" />
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

  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center">
        <Clock className="h-10 w-10 text-slate-300 mb-3 stroke-1" />
        <h4 className="text-sm font-bold text-slate-800">Belum Ada Shift Terdaftar</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          Buat master shift baru untuk mengatur jam operasional masuk, pulang, dan toleransi keterlambatan.
        </p>
        <Button variant="primary" size="sm" onClick={onAddNew}>
          + Buat Shift Pertama
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4">Nama Shift</th>
              <th className="py-3 px-3 text-center">Kode</th>
              <th className="py-3 px-4">Jam Kerja</th>
              <th className="py-3 px-3 text-center">Istirahat</th>
              <th className="py-3 px-3 text-center">Toleransi</th>
              <th className="py-3 px-3 text-center">Overnight</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.map((shift, index) => {
              const isActive = shift.status === 'ACTIVE';
              return (
                <tr
                  key={shift.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    !isActive ? 'bg-slate-50/40 text-slate-400' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs">
                        {shift.name}
                      </span>
                      {shift.description && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs">
                          {shift.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {shift.code || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      <span>{shift.startTime} – {shift.endTime} WIB</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-slate-600 font-medium">
                      {shift.breakMinutes} mnt
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                      +{shift.toleranceMinutes} mnt
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {shift.isOvernight ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Moon className="h-3 w-3" /> Ya
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                        <Sun className="h-3 w-3" /> Tidak
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge variant={isActive ? 'success' : 'neutral'} dot>
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(shift)}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit Shift"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline ml-1">Edit</span>
                      </Button>

                      {isActive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeactivate(shift)}
                          className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="Nonaktifkan Shift"
                        >
                          <PowerOff className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline ml-1">Nonaktifkan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onActivate(shift)}
                          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Aktifkan Shift"
                        >
                          <Power className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline ml-1">Aktifkan</span>
                        </Button>
                      )}
                    </div>
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
