'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ChevronRight, Clock, CalendarCheck } from 'lucide-react';

import { getAuthHeaders } from '@/lib/api';

export interface RecentAttendanceItem {
  id: string;
  employee: string;
  employeeId?: string;
  department?: string;
  shift?: string | null;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
  workingMinutes?: number | null;
}

interface RecentAttendanceProps {
  records?: RecentAttendanceItem[];
}

export const RecentAttendance: React.FC<RecentAttendanceProps> = ({ records: propRecords }) => {
  const [records, setRecords] = useState<RecentAttendanceItem[]>(propRecords || []);
  const [isLoading, setIsLoading] = useState<boolean>(!propRecords);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propRecords) {
      setRecords(propRecords);
      setIsLoading(false);
      return;
    }

    const fetchRecent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/dashboard/recent-attendance?limit=6', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch recent attendance');
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Unable to load recent attendance');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecent();
  }, [propRecords]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d) + ' WIB';
    } catch {
      return isoString;
    }
  };

  return (
    <Card className="col-span-full lg:col-span-8 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Recent Attendance Activity</CardTitle>
          <CardDescription>Live log of latest staff clock-ins and status verification</CardDescription>
        </div>
        <Link
          href="/attendance"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {/* Loading state */}
        {isLoading && (
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse py-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-slate-200 rounded" />
                    <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-16 bg-slate-100 rounded" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="p-6 text-center text-xs text-rose-600 bg-rose-50/50">
            <p className="font-semibold">Unable to fetch recent records</p>
            <p className="text-rose-500 mt-1">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && records.length === 0 && (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center">
            <CalendarCheck className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No attendance activity recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Logs will appear here once employees clock in.</p>
          </div>
        )}

        {/* List of recent records */}
        {!isLoading && !error && records.length > 0 && (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={record.employee} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {record.employee}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <span>{record.employeeId ? `${record.employeeId} • ` : ''}{record.department || 'General'}</span>
                      <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {record.shift || 'Non-Shift'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-medium text-slate-800 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatTime(record.checkIn)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {record.checkOut ? `Out: ${formatTime(record.checkOut)}` : 'In Progress'} • {formatDate(record.date)}
                    </span>
                  </div>

                  <Badge
                    variant={
                      record.status === 'PRESENT'
                        ? 'success'
                        : record.status === 'LATE'
                        ? 'warning'
                        : record.status === 'LEAVE'
                        ? 'info'
                        : 'danger'
                    }
                    dot
                    className="w-20 justify-center text-[10px]"
                  >
                    {record.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
