'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { Calendar, BarChart2 } from 'lucide-react';

import { getAuthHeaders } from '@/lib/api';

interface DailyTrendItem {
  date: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
}

export const AttendanceChart: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [trendData, setTrendData] = useState<DailyTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const endStr = now.toISOString().split('T')[0];

      const start = new Date(now);
      const daysToSubtract = selectedRange === '7d' ? 6 : selectedRange === '14d' ? 13 : 29;
      start.setDate(start.getDate() - daysToSubtract);
      const startStr = start.toISOString().split('T')[0];

      const res = await fetch(
        `/api/dashboard/attendance-overview?startDate=${startStr}&endDate=${endStr}`,
        {
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );
      if (!res.ok) {
        throw new Error('Failed to fetch attendance trend');
      }
      const json = await res.json();
      setTrendData(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load attendance overview');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchTrendData();
  }, [fetchTrendData]);

  // Overall totals across the displayed period
  const totalPresent = trendData.reduce((acc, d) => acc + d.present, 0);
  const totalLate = trendData.reduce((acc, d) => acc + d.late, 0);
  const totalWorkAttendances = totalPresent + totalLate;
  const punctualityRate =
    totalWorkAttendances > 0
      ? ((totalPresent / totalWorkAttendances) * 100).toFixed(1)
      : '100.0';

  return (
    <Card className="col-span-full lg:col-span-8 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Attendance Trend Overview</CardTitle>
          <CardDescription>Daily present, late, absent, and leave counts</CardDescription>
        </div>

        {/* Period Selector Toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
          {(['7d', '14d', '30d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setSelectedRange(range)}
              className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                selectedRange === range
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '14d' ? 'Last 14 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart Legend & Metric */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs text-slate-600 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-amber-500" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-rose-500" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-blue-500" />
              <span>On Leave</span>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Average Period Punctuality:{' '}
            <span className="font-bold text-slate-800">{punctualityRate}%</span>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-3 bg-slate-200 rounded w-28" />
                <div className="h-3.5 bg-slate-100 rounded-full w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="py-8 text-center text-xs text-rose-600 bg-rose-50/50 rounded-xl border border-rose-100">
            <p className="font-semibold">Unable to load attendance overview</p>
            <p className="text-rose-500 mt-1">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && trendData.length === 0 && (
          <div className="py-10 text-center text-slate-400 flex flex-col items-center">
            <BarChart2 className="h-8 w-8 mb-2 stroke-1" />
            <p className="text-xs font-semibold text-slate-600">No attendance data found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">There are no attendance records in this date range.</p>
          </div>
        )}

        {/* Visual Daily Stacked Bar Chart */}
        {!isLoading && !error && trendData.length > 0 && (
          <div className="space-y-3.5 pt-1 max-h-[360px] overflow-y-auto pr-1">
            {trendData.map((item) => {
              const totalDayRecords = item.present + item.late + item.absent + item.leave;
              const maxScale = Math.max(totalDayRecords, 1);

              const presentPercent = (item.present / maxScale) * 100;
              const latePercent = (item.late / maxScale) * 100;
              const absentPercent = (item.absent / maxScale) * 100;
              const leavePercent = (item.leave / maxScale) * 100;

              return (
                <div key={item.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {formatDate(item.date)}
                    </span>
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                      {item.present > 0 && (
                        <span className="text-emerald-700 font-medium">{item.present} Present</span>
                      )}
                      {item.late > 0 && (
                        <span className="text-amber-700 font-medium">{item.late} Late</span>
                      )}
                      {item.absent > 0 && (
                        <span className="text-rose-700 font-medium">{item.absent} Absent</span>
                      )}
                      {item.leave > 0 && (
                        <span className="text-blue-700 font-medium">{item.leave} Leave</span>
                      )}
                      {totalDayRecords === 0 && (
                        <span className="text-slate-400 italic">No logs</span>
                      )}
                    </div>
                  </div>

                  {/* Stacked Progress Bar */}
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-xs">
                    {item.present > 0 && (
                      <div
                        style={{ width: `${presentPercent}%` }}
                        className="bg-emerald-500 hover:bg-emerald-600 transition-all"
                        title={`Present: ${item.present}`}
                      />
                    )}
                    {item.late > 0 && (
                      <div
                        style={{ width: `${latePercent}%` }}
                        className="bg-amber-400 hover:bg-amber-500 transition-all"
                        title={`Late: ${item.late}`}
                      />
                    )}
                    {item.absent > 0 && (
                      <div
                        style={{ width: `${absentPercent}%` }}
                        className="bg-rose-500 hover:bg-rose-600 transition-all"
                        title={`Absent: ${item.absent}`}
                      />
                    )}
                    {item.leave > 0 && (
                      <div
                        style={{ width: `${leavePercent}%` }}
                        className="bg-blue-500 hover:bg-blue-600 transition-all"
                        title={`On Leave: ${item.leave}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
