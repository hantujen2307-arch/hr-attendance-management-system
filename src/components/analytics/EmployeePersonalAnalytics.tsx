'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CalendarCheck,
  ClockAlert,
  CalendarOff,
  Timer,
  Banknote,
  Receipt,
  Award,
  User,
  Clock,
} from 'lucide-react';

interface EmployeePersonalAnalyticsProps {
  data: {
    employee?: {
      id?: string;
      name?: string;
      employeeId?: string;
      department?: string;
      position?: string;
      shift?: string;
    };
    attendance?: {
      totalLogged: number;
      present: number;
      late: number;
      absent: number;
      leave: number;
      sick: number;
      businessTrip: number;
      totalWorkHours: number;
      attendanceRate: number;
      punctualityRate: number;
    };
    leave?: {
      totalRequests: number;
      approved: number;
      pending: number;
      rejected: number;
    };
    overtime?: {
      totalRequests: number;
      approvedHours: string;
      pendingRequests: number;
    };
    payroll?: {
      latestSalary: number;
      records: Array<{
        id: string;
        periodName: string;
        netSalary: number;
        status: string;
        payDate?: string | null;
      }>;
    };
    reimbursement?: {
      totalRequests: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
    };
    performance?: {
      score: number;
      rating: string;
    };
  };
}

export const EmployeePersonalAnalytics: React.FC<EmployeePersonalAnalyticsProps> = ({ data }) => {
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Profile & KPI Hero Card */}
      <Card className="border-blue-200 bg-linear-to-r from-blue-50/70 via-white to-indigo-50/50 shadow-2xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {data.employee?.name || 'Karyawan'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-mono font-semibold text-slate-700">
                    {data.employee?.employeeId}
                  </span>
                  <span>•</span>
                  <span>{data.employee?.department || 'General'}</span>
                  <span>•</span>
                  <span>{data.employee?.position || 'Staff'}</span>
                  <span>•</span>
                  <Badge variant="info" className="text-[10px]">
                    Shift: {data.employee?.shift || 'Reguler'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nilai Disiplin & Performa
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-blue-600">
                    {data.performance?.score ?? 0}
                    <span className="text-xs text-slate-400 font-normal"> / 100</span>
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    {data.performance?.rating || 'A'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Personal Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Kehadiran Saya
              </span>
              <h4 className="text-2xl font-bold text-emerald-600 mt-1">
                {data.attendance?.attendanceRate ?? 0}%
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {data.attendance?.present ?? 0} Hadir • {data.attendance?.late ?? 0} Telat
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Working Hours & Overtime */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Jam Kerja & Lembur
              </span>
              <h4 className="text-2xl font-bold text-indigo-600 mt-1 font-mono">
                {data.attendance?.totalWorkHours ?? 0} <span className="text-xs font-normal text-slate-500 font-sans">Jam</span>
              </h4>
              <p className="text-[11px] text-indigo-600 mt-0.5">
                + {data.overtime?.approvedHours ?? '0'} jam lembur
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Timer className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Leave Taken */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pengajuan Cuti / Izin
              </span>
              <h4 className="text-2xl font-bold text-blue-600 mt-1">
                {data.leave?.approved ?? 0} <span className="text-xs font-normal text-slate-500">Disetujui</span>
              </h4>
              <p className="text-[11px] text-amber-600 mt-0.5">
                {data.leave?.pending ?? 0} Menunggu persetujuan
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarOff className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Reimbursement Claims */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Klaim Reimbursement
              </span>
              <h4 className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(data.reimbursement?.paidAmount)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {data.reimbursement?.totalRequests ?? 0} Total Pengajuan
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary History Cards */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Riwayat Penggajian Saya
              </CardTitle>
              <CardDescription className="text-xs">
                Rekap penerimaan gaji bulanan yang telah diproses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          {(!data.payroll?.records || data.payroll.records.length === 0) ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada riwayat slip gaji yang diterbitkan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.payroll.records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-800">{rec.periodName}</span>
                    <Badge variant={rec.status === 'PAID' ? 'success' : 'warning'} className="text-[10px]">
                      {rec.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">Gaji Bersih (Take Home Pay)</span>
                    <span className="font-bold font-mono text-sm text-emerald-700">
                      {formatCurrency(rec.netSalary)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
