'use client';

import React from 'react';
import { EmployeeRecord } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import {
  Eye,
  Edit2,
  UserX,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
} from 'lucide-react';

interface EmployeeTableProps {
  employees: EmployeeRecord[];
  loading: boolean;
  onViewDetail: (employee: EmployeeRecord) => void;
  onEdit: (employee: EmployeeRecord) => void;
  onDeactivate: (employee: EmployeeRecord) => void;
  onActivate: (employee: EmployeeRecord) => void;
  onAddNew: () => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  loading,
  onViewDetail,
  onEdit,
  onDeactivate,
  onActivate,
  onAddNew,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 w-1/4">
                <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 bg-slate-100 rounded w-20 hidden md:block" />
              <div className="h-4 bg-slate-100 rounded w-28 hidden lg:block" />
              <div className="h-4 bg-slate-100 rounded w-24 hidden sm:block" />
              <div className="h-6 bg-slate-200 rounded-full w-16" />
              <div className="h-8 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <UserPlus className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Belum ada data karyawan</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          Tidak ditemukan data karyawan yang sesuai dengan kriteria pencarian atau filter yang dipilih.
        </p>
        <Button variant="primary" onClick={onAddNew} className="gap-2">
          <UserPlus className="h-4 w-4" />
          + TAMBAH KARYAWAN
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View (md and up) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Foto & Nama</th>
                <th className="py-3.5 px-4">NIP</th>
                <th className="py-3.5 px-4">Jabatan</th>
                <th className="py-3.5 px-4">Unit Kerja</th>
                <th className="py-3.5 px-4">Email & Telepon</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp, index) => {
                const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                const isInactive = emp.employmentStatus === 'INACTIVE';
                const isOnLeave = emp.employmentStatus === 'ON_LEAVE';

                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isInactive ? 'bg-slate-50/40 text-slate-500' : ''
                    }`}
                  >
                    {/* No */}
                    <td className="py-3 px-4 text-center font-medium text-slate-400 text-xs">
                      {index + 1}
                    </td>

                    {/* Foto & Nama */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={fullName}
                          src={emp.photo || undefined}
                          size="md"
                          className={isInactive ? 'grayscale opacity-75' : ''}
                        />
                        <div className="min-w-0">
                          <p
                            onClick={() => onViewDetail(emp)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer truncate"
                          >
                            {fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            Mulai: {formatDate(emp.joinDate)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* NIP */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                        {emp.employeeId}
                      </span>
                    </td>

                    {/* Jabatan */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 truncate block max-w-[150px]" title={emp.position}>
                        {emp.position}
                      </span>
                    </td>

                    {/* Unit Kerja */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100/90 text-slate-700 border border-slate-200/60">
                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                        {emp.department?.name || '-'}
                      </span>
                    </td>

                    {/* Email & Telepon */}
                    <td className="py-3 px-4 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1 text-slate-600 truncate">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]" title={emp.email}>
                            {emp.email}
                          </span>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          emp.employmentStatus === 'ACTIVE'
                            ? 'success'
                            : isOnLeave
                            ? 'info'
                            : 'neutral'
                        }
                        dot
                        className="text-[11px] uppercase tracking-wider font-semibold"
                      >
                        {emp.employmentStatus === 'ACTIVE'
                          ? 'AKTIF'
                          : isOnLeave
                          ? 'CUTI'
                          : 'NONAKTIF'}
                      </Badge>
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetail(emp)}
                          className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                          title="Lihat Detail Profil & Riwayat"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          DETAIL
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(emp)}
                          className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
                          title="Edit Data Karyawan"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          EDIT
                        </Button>

                        {isInactive ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onActivate(emp)}
                            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            title="Aktifkan Kembali Karyawan"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            AKTIFKAN
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onDeactivate(emp)}
                            className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            title="Nonaktifkan Karyawan"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            NONAKTIFKAN
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

      {/* Mobile Cards View (sm and down) */}
      <div className="md:hidden space-y-3">
        {employees.map((emp, index) => {
          const fullName = `${emp.firstName} ${emp.lastName}`.trim();
          const isInactive = emp.employmentStatus === 'INACTIVE';
          const isOnLeave = emp.employmentStatus === 'ON_LEAVE';

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 ${
                isInactive ? 'opacity-80 bg-slate-50/50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={fullName}
                    src={emp.photo || undefined}
                    size="lg"
                    className={isInactive ? 'grayscale' : ''}
                  />
                  <div>
                    <h4
                      onClick={() => onViewDetail(emp)}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                    >
                      {fullName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">{emp.position}</p>
                    <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50 mt-1 inline-block">
                      {emp.employeeId}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={
                    emp.employmentStatus === 'ACTIVE'
                      ? 'success'
                      : isOnLeave
                      ? 'info'
                      : 'neutral'
                  }
                  dot
                  className="text-[10px] uppercase tracking-wider font-semibold shrink-0"
                >
                  {emp.employmentStatus === 'ACTIVE'
                    ? 'AKTIF'
                    : isOnLeave
                    ? 'CUTI'
                    : 'NONAKTIF'}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{emp.department?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetail(emp)}
                  className="h-8 text-xs text-blue-600 border-blue-200"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  DETAIL
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(emp)}
                  className="h-8 text-xs text-slate-700"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  EDIT
                </Button>
                {isInactive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onActivate(emp)}
                    className="h-8 text-xs text-emerald-600 border-emerald-200"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    AKTIFKAN
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDeactivate(emp)}
                    className="h-8 text-xs text-rose-600 border-rose-200"
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" />
                    NONAKTIFKAN
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
