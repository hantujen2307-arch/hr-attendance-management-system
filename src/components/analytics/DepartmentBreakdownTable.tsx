'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Building2 } from 'lucide-react';

interface DepartmentBreakdownItem {
  id: string;
  name: string;
  code?: string | null;
  employeeCount: number;
  totalAttendance: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
  overtimeHours: string;
  payrollTotal: number;
  reimbursementTotal: number;
}

interface DepartmentBreakdownTableProps {
  departments: DepartmentBreakdownItem[];
}

export const DepartmentBreakdownTable: React.FC<DepartmentBreakdownTableProps> = ({ departments }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Breakdown Analitik Per Departemen
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan kehadiran, lembur, biaya gaji, dan klaim berdasarkan divisi organisasi
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {departments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Tidak ada data departemen yang ditemukan.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departemen</TableHead>
                <TableHead className="text-center">Karyawan</TableHead>
                <TableHead className="text-center">Kehadiran</TableHead>
                <TableHead className="text-center">Terlambat</TableHead>
                <TableHead className="text-center">Alpha</TableHead>
                <TableHead className="text-center">Tingkat Hadir</TableHead>
                <TableHead className="text-center">Jam Lembur</TableHead>
                <TableHead className="text-right">Total Gaji</TableHead>
                <TableHead className="text-right">Reimbursement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => {
                return (
                  <TableRow key={dept.id}>
                    {/* Nama Departemen */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{dept.name}</span>
                        {dept.code && (
                          <span className="text-[10px] text-slate-400 font-mono">{dept.code}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Jumlah Karyawan */}
                    <TableCell className="text-center font-bold text-slate-800">
                      {dept.employeeCount}
                    </TableCell>

                    {/* Presensi */}
                    <TableCell className="text-center text-emerald-600 font-semibold">
                      {dept.presentCount}
                    </TableCell>

                    {/* Terlambat */}
                    <TableCell className="text-center text-amber-600 font-semibold">
                      {dept.lateCount}
                    </TableCell>

                    {/* Alpha */}
                    <TableCell className="text-center text-rose-500 font-semibold">
                      {dept.absentCount}
                    </TableCell>

                    {/* Rate */}
                    <TableCell className="text-center">
                      <Badge
                        variant={dept.attendanceRate >= 85 ? 'success' : dept.attendanceRate >= 70 ? 'warning' : 'danger'}
                        className="font-bold text-xs"
                      >
                        {dept.attendanceRate}%
                      </Badge>
                    </TableCell>

                    {/* Lembur */}
                    <TableCell className="text-center font-mono text-indigo-700 font-semibold">
                      {dept.overtimeHours} jam
                    </TableCell>

                    {/* Gaji */}
                    <TableCell className="text-right font-mono text-xs text-slate-800 font-medium">
                      {formatCurrency(dept.payrollTotal)}
                    </TableCell>

                    {/* Reimbursement */}
                    <TableCell className="text-right font-mono text-xs text-orange-700 font-medium">
                      {formatCurrency(dept.reimbursementTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
