'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  PieChart,
  GitCommit,
  Layers,
  Receipt,
  CalendarCheck,
} from 'lucide-react';

interface AnalyticsChartsProps {
  data: {
    attendance?: {
      dailyTrends?: Array<{
        date: string;
        present: number;
        late: number;
        absent: number;
        total: number;
      }>;
    };
    leave?: {
      typeDistribution?: Record<string, number>;
      status?: { approved: number; pending: number; rejected: number };
    };
    reimbursement?: {
      categories?: Record<string, number>;
    };
    recruitment?: {
      funnel?: {
        applied: number;
        screening: number;
        interview: number;
        selected: number;
        hired: number;
        rejected: number;
      };
    };
    shifts?: Array<{
      id: string;
      name: string;
      code?: string | null;
      workingHours: string;
      employeeCount: number;
    }>;
  };
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const trends = data.attendance?.dailyTrends || [];
  const maxTrendTotal = Math.max(...trends.map((t) => t.total), 1);

  const funnel = data.recruitment?.funnel || {
    applied: 0,
    screening: 0,
    interview: 0,
    selected: 0,
    hired: 0,
    rejected: 0,
  };
  const maxFunnel = Math.max(funnel.applied, 1);

  const categories = data.reimbursement?.categories || {};
  const categoryKeys = Object.keys(categories);
  const totalCategoryAmount = Object.values(categories).reduce((acc, c) => acc + c, 0) || 1;

  const leaveTypes = data.leave?.typeDistribution || {};
  const leaveTypeKeys = Object.keys(leaveTypes);
  const totalLeaves = Object.values(leaveTypes).reduce((acc, l) => acc + l, 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Daily Attendance Trend Visualizer */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Tren Kehadiran Harian
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribusi kehadiran harian (Hadir, Terlambat, Alpha)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hadir
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Terlambat
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Alpha
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {trends.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada data rekaman presensi pada rentang periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-44 flex items-end gap-1.5 pt-4 pb-1 overflow-x-auto border-b border-slate-100">
                {trends.slice(-14).map((item) => {
                  const presentH = Math.round((item.present / maxTrendTotal) * 120);
                  const lateH = Math.round((item.late / maxTrendTotal) * 120);
                  const absentH = Math.round((item.absent / maxTrendTotal) * 120);

                  return (
                    <div
                      key={item.date}
                      className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] p-1.5 rounded shadow-md pointer-events-none whitespace-nowrap">
                        <span className="font-bold">{item.date}</span>
                        <span>
                          Hadir: {item.present} | Telat: {item.late} | Alpha: {item.absent}
                        </span>
                      </div>

                      {/* Stacked bar */}
                      <div className="w-full max-w-[20px] flex flex-col justify-end gap-0.5 rounded-t overflow-hidden">
                        {absentH > 0 && (
                          <div
                            style={{ height: `${absentH}px` }}
                            className="w-full bg-rose-500 transition-all duration-300"
                          />
                        )}
                        {lateH > 0 && (
                          <div
                            style={{ height: `${lateH}px` }}
                            className="w-full bg-amber-500 transition-all duration-300"
                          />
                        )}
                        {presentH > 0 && (
                          <div
                            style={{ height: `${presentH}px` }}
                            className="w-full bg-emerald-500 transition-all duration-300"
                          />
                        )}
                      </div>

                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                        {item.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Recruitment Funnel Chart */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <GitCommit className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Recruitment & Hiring Funnel
              </CardTitle>
              <CardDescription className="text-xs">
                Perjalanan pelamar dari pendaftaran hingga konversi diterima (*Hired*)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-2.5">
          {[
            { label: 'Pendaftar (Applied)', count: funnel.applied, color: 'bg-blue-500' },
            { label: 'Screening CV', count: funnel.screening, color: 'bg-indigo-500' },
            { label: 'Wawancara (Interview)', count: funnel.interview, color: 'bg-purple-500' },
            { label: 'Terpilih (Selected)', count: funnel.selected, color: 'bg-amber-500' },
            { label: 'Diterima Karyawan (Hired)', count: funnel.hired, color: 'bg-emerald-500' },
            { label: 'Tidak Lolos (Rejected)', count: funnel.rejected, color: 'bg-rose-400' },
          ].map((stage) => {
            const percentage = Math.round((stage.count / maxFunnel) * 100);

            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{stage.label}</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {stage.count} <span className="text-[10px] text-slate-400 font-normal font-sans">pelamar</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Reimbursement Expenses by Category */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Distribusi Biaya Reimbursement
              </CardTitle>
              <CardDescription className="text-xs">
                Kategori pengeluaran operasional dan klaim staf
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {categoryKeys.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada klaim reimbursement dalam periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryKeys.map((catKey) => {
                const amount = categories[catKey] || 0;
                const pct = Math.round((amount / totalCategoryAmount) * 100);

                return (
                  <div key={catKey} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 font-medium uppercase tracking-tight">
                        {catKey.replace(/_/g, ' ')}
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(amount)}{' '}
                        <span className="text-[11px] text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Leave Types & Shifts Distribution */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Alokasi Shift & Pengajuan Cuti
              </CardTitle>
              <CardDescription className="text-xs">
                Sebaran jadwal kerja dan tipe permohonan ketidakhadiran
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {/* Shifts */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Distribusi Shift Kerja
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(data.shifts || []).map((s) => (
                <div key={s.id} className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-slate-800 truncate">{s.name}</span>
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {s.employeeCount} Staf
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {s.workingHours} WIB
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Type breakdown */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Jenis Permohonan Izin / Cuti
            </span>
            {leaveTypeKeys.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada pengajuan cuti dalam periode ini.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {leaveTypeKeys.map((typeName) => (
                  <div
                    key={typeName}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
                  >
                    <span className="font-medium text-slate-700">{typeName}</span>
                    <Badge variant="neutral" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                      {leaveTypes[typeName]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
