'use client';

import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Settings2, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmployeeSalary } from '@/types';

interface EmployeeWithSalary {
  id: string;
  employeeId: string;
  firstName: string;
  lastName?: string;
  position?: string | null;
  department?: { id: string; name: string } | null;
  salary?: EmployeeSalary | null;
}

interface SalaryMasterTableProps {
  employees: EmployeeWithSalary[];
  isLoading: boolean;
  onEditSalary: (employee: EmployeeWithSalary) => void;
}

export const SalaryMasterTable: React.FC<SalaryMasterTableProps> = ({
  employees,
  isLoading,
  onEditSalary,
}) => {
  const formatRupiah = (val?: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm">Memuat data master gaji karyawan...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Karyawan</th>
              <th className="px-4 py-3">Gaji Pokok</th>
              <th className="px-4 py-3">Tunjangan Tetap</th>
              <th className="px-4 py-3">Potongan Tetap</th>
              <th className="px-4 py-3">Tarif Lembur / Jam</th>
              <th className="px-4 py-3">Info Rekening Bank</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {employees.map((emp) => {
              const fullName = `${emp.firstName} ${emp.lastName || ''}`.trim();
              const s = emp.salary;
              const hasCustomRate = s?.overtimeRatePerHour !== undefined && s?.overtimeRatePerHour !== null;
              const defaultHourlyRate = Math.round((Number(s?.basicSalary) || 0) / 173);

              return (
                <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-900">{fullName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{emp.employeeId}</span>
                          <span>•</span>
                          <span>{emp.department?.name || 'Umum'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs">
                    <div className="font-semibold text-slate-900">
                      {s ? formatRupiah(Number(s.basicSalary)) : <span className="text-amber-600 font-normal italic">Belum diatur</span>}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs">
                    <div className="text-slate-700">
                      {s ? formatRupiah(Number(s.allowances)) : 'Rp 0'}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs">
                    <div className="text-rose-600">
                      {s ? formatRupiah(Number(s.deductions)) : 'Rp 0'}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs">
                    {hasCustomRate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        {formatRupiah(Number(s?.overtimeRatePerHour))}/jam
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Otomatis ({formatRupiah(defaultHourlyRate)}/jam)
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-xs">
                    {s?.bankAccountNumber ? (
                      <div>
                        <span className="font-medium text-slate-800">{s.bankName || 'BCA'}: </span>
                        <span className="text-slate-600">{s.bankAccountNumber}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditSalary(emp)}
                      className="h-8 px-2.5 text-xs flex items-center gap-1.5 ml-auto"
                    >
                      <Settings2 className="h-3.5 w-3.5 text-blue-600" />
                      <span>Atur Gaji</span>
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
