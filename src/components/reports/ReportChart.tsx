'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface SummaryData {
  present: number;
  late: number;
  leave: number;
  sick: number;
  businessTrip: number;
  absent: number;
  totalRecords?: number;
}

interface TrendPoint {
  date: string;
  present: number;
  late: number;
  izin: number;
  cuti: number;
  sick: number;
  businessTrip: number;
  absent: number;
}

interface ReportChartProps {
  summary: SummaryData;
  trendData?: TrendPoint[];
  isLoading?: boolean;
}

export const ReportChart: React.FC<ReportChartProps> = ({
  summary,
  trendData = [],
  isLoading = false,
}) => {
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const total =
    summary.present +
    summary.late +
    summary.leave +
    summary.sick +
    summary.businessTrip +
    summary.absent;

  const getPercentage = (count: number) => {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  // Find max count for scaling trend bars
  const maxTrend = Math.max(
    1,
    ...trendData.map((d) => d.present + d.late + d.izin + d.cuti + d.sick + d.businessTrip + d.absent)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
      {/* 1. Statistik Kehadiran Breakdown Card (5 cols) */}
      <Card className="lg:col-span-5 shadow-xs border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Statistik Kehadiran</CardTitle>
              <CardDescription className="text-xs">
                Proporsi status kehadiran pada periode filter
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {/* Hadir */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Hadir Tepat Waktu
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {summary.present} ({getPercentage(summary.present)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${getPercentage(summary.present)}%` }}
              />
            </div>
          </div>

          {/* Terlambat */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Terlambat
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {summary.late} ({getPercentage(summary.late)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${getPercentage(summary.late)}%` }}
              />
            </div>
          </div>

          {/* Izin / Cuti */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Izin / Cuti
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {summary.leave} ({getPercentage(summary.leave)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${getPercentage(summary.leave)}%` }}
              />
            </div>
          </div>

          {/* Sakit */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                Sakit
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {summary.sick} ({getPercentage(summary.sick)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${getPercentage(summary.sick)}%` }}
              />
            </div>
          </div>

          {/* Dinas Luar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                Dinas Luar
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {summary.businessTrip} ({getPercentage(summary.businessTrip)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${getPercentage(summary.businessTrip)}%` }}
              />
            </div>
          </div>

          {/* Alpha */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Alpha / Tanpa Keterangan
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {summary.absent} ({getPercentage(summary.absent)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${getPercentage(summary.absent)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Trend Kehadiran Visual Timeline (7 cols) */}
      <Card className="lg:col-span-7 shadow-xs border-slate-200">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Trend Kehadiran Harian</CardTitle>
              <CardDescription className="text-xs">
                Pergerakan jumlah karyawan per tanggal
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setViewPeriod('daily')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewPeriod === 'daily'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setViewPeriod('weekly')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewPeriod === 'weekly'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Mingguan
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {trendData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
              <Calendar className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Belum ada data tren pada periode ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stacked Bar Chart */}
              <div className="h-48 flex items-end gap-1.5 overflow-x-auto pb-4 pt-6">
                {trendData.map((pt) => {
                  const dayTotal =
                    pt.present + pt.late + pt.izin + pt.cuti + pt.sick + pt.businessTrip + pt.absent;
                  const heightPercent = Math.max(6, Math.round((dayTotal / maxTrend) * 100));

                  return (
                    <div
                      key={pt.date}
                      className="flex-1 min-w-[28px] flex flex-col items-center group relative cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 z-20 whitespace-nowrap shadow-xl">
                        <span className="font-bold border-b border-slate-700 pb-0.5 mb-1">
                          {formatDate(pt.date)}
                        </span>
                        <span>Hadir: {pt.present}</span>
                        <span>Terlambat: {pt.late}</span>
                        <span>Izin/Cuti: {pt.izin + pt.cuti}</span>
                        <span>Sakit/Dinas: {pt.sick + pt.businessTrip}</span>
                        <span>Alpha: {pt.absent}</span>
                      </div>

                      {/* Stacked Vertical Bar */}
                      <div
                        className="w-full rounded-t-md bg-slate-100 flex flex-col justify-end overflow-hidden transition-all duration-300 group-hover:brightness-95"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {pt.absent > 0 && (
                          <div
                            style={{ height: `${(pt.absent / dayTotal) * 100}%` }}
                            className="w-full bg-rose-500"
                          />
                        )}
                        {(pt.sick > 0 || pt.businessTrip > 0) && (
                          <div
                            style={{ height: `${((pt.sick + pt.businessTrip) / dayTotal) * 100}%` }}
                            className="w-full bg-indigo-500"
                          />
                        )}
                        {(pt.izin > 0 || pt.cuti > 0) && (
                          <div
                            style={{ height: `${((pt.izin + pt.cuti) / dayTotal) * 100}%` }}
                            className="w-full bg-blue-500"
                          />
                        )}
                        {pt.late > 0 && (
                          <div
                            style={{ height: `${(pt.late / dayTotal) * 100}%` }}
                            className="w-full bg-amber-500"
                          />
                        )}
                        {pt.present > 0 && (
                          <div
                            style={{ height: `${(pt.present / dayTotal) * 100}%` }}
                            className="w-full bg-emerald-500"
                          />
                        )}
                      </div>

                      {/* Day label */}
                      <span className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-full">
                        {pt.date.split('-')[2]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Hadir
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Terlambat
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Izin/Cuti
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Sakit/Dinas
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Alpha
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
