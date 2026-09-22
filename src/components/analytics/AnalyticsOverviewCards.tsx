'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Users,
  CalendarCheck,
  ClockAlert,
  Timer,
  Banknote,
  Receipt,
  UserPlus,
  TrendingUp,
  Award,
} from 'lucide-react';

interface AnalyticsOverviewCardsProps {
  data: {
    headcount?: {
      total: number;
      active: number;
      inactive: number;
      onLeave: number;
    };
    attendance?: {
      totalRecords: number;
      attendanceRate: number;
      punctualityRate: number;
      lateRate: number;
      absentRate: number;
    };
    overtime?: {
      totalRequests: number;
      approvedHours: string;
      pendingCount: number;
    };
    payroll?: {
      totalGrossPaid: number;
      totalNetPaid: number;
      averageNetSalary: number;
    };
    reimbursement?: {
      totalAmount: number;
      approvedAmount: number;
      paidAmount: number;
      pendingAmount: number;
    };
    recruitment?: {
      totalVacancies: number;
      activeVacancies: number;
      totalApplicants: number;
      conversionRate: number;
    };
    performance?: {
      consistencyScore: number;
      rating: string;
    };
  };
}

export const AnalyticsOverviewCards: React.FC<AnalyticsOverviewCardsProps> = ({ data }) => {
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total & Active Headcount */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Karyawan
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {data.headcount?.total ?? 0}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">
              {data.headcount?.active ?? 0} Aktif
            </span>
            <span>•</span>
            <span className="text-slate-500">{data.headcount?.onLeave ?? 0} Cuti</span>
            <span>•</span>
            <span className="text-rose-500">{data.headcount?.inactive ?? 0} Nonaktif</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Attendance & Punctuality */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tingkat Kehadiran
              </span>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {data.attendance?.attendanceRate ?? 0}%
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">
              Ketepatan: {data.attendance?.punctualityRate ?? 0}%
            </span>
            <span className="text-amber-600 font-medium">
              Terlambat: {data.attendance?.lateRate ?? 0}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Approved Overtime */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Jam Lembur
              </span>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1 font-mono">
                {data.overtime?.approvedHours ?? '0.0'}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">Jam</span>
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Timer className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{data.overtime?.totalRequests ?? 0} Total Pengajuan</span>
            <span className="text-amber-600 font-medium">
              {data.overtime?.pendingCount ?? 0} Menunggu
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. KPI Performance Rating */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Indeks Disiplin & KPI
              </span>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                {data.performance?.consistencyScore ?? 0}
                <span className="text-xs text-slate-400 font-normal"> / 100</span>
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Grade: {data.performance?.rating ?? 'B (Good)'}
            </span>
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Stabil
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Total Payroll Paid */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Realisasi Penggajian
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(data.payroll?.totalNetPaid)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Rata-rata: {formatCurrency(data.payroll?.averageNetSalary)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 6. Reimbursement Claims */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Realisasi Reimbursement
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(data.reimbursement?.paidAmount)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-amber-600 font-medium">
              Pending: {formatCurrency(data.reimbursement?.pendingAmount)}
            </span>
            <span className="text-slate-400">
              Total: {formatCurrency(data.reimbursement?.totalAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 7. Recruitment Funnel */}
      <Card className="border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow sm:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rekrutmen & Pelamar
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <h3 className="text-2xl font-bold text-slate-900">
                  {data.recruitment?.totalApplicants ?? 0}{' '}
                  <span className="text-xs font-normal text-slate-500">Pelamar Masuk</span>
                </h3>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Konversi: {data.recruitment?.conversionRate ?? 0}%
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{data.recruitment?.activeVacancies ?? 0} Lowongan Aktif</span>
            <span>•</span>
            <span>{data.recruitment?.totalVacancies ?? 0} Total Lowongan Dibuka</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
