'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  ClockAlert,
  UserX,
  CalendarOff,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { RecentAttendance } from '@/components/dashboard/RecentAttendance';
import { EmployeeDashboardView } from '@/components/dashboard/EmployeeDashboardView';
import { Button } from '@/components/ui/Button';

import { getAuthHeaders } from '@/lib/api';

interface CompanySummary {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  onLeaveToday: number;
  isEmployee?: false;
}

export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to fetch dashboard metrics');
      }
      const data = await res.json();
      setSummaryData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Loading skeleton
  if (isLoading && !summaryData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 p-4 animate-pulse space-y-3">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-7 w-16 bg-slate-200 rounded" />
              <div className="h-2 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-72 rounded-xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  // Error state
  if (errorMessage && !summaryData) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50/70 border border-rose-200 text-center max-w-lg mx-auto my-12 space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Dashboard Service Unavailable</h3>
        <p className="text-xs text-rose-700">{errorMessage}</p>
        <Button variant="primary" size="sm" onClick={fetchSummary} className="gap-1.5 mt-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      </div>
    );
  }

  // If user is EMPLOYEE, render dedicated personal dashboard view
  if (summaryData?.isEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">My Dashboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal attendance records, shift rosters, and work metrics
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSummary} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Refresh
          </Button>
        </div>

        <EmployeeDashboardView data={summaryData} onRefresh={fetchSummary} />
      </div>
    );
  }

  // ADMIN / HR: Company-Wide Live Dashboard
  const adminData = summaryData as CompanySummary;

  const total = adminData?.totalEmployees || 0;
  const present = adminData?.presentToday || 0;
  const late = adminData?.lateToday || 0;
  const absent = adminData?.absentToday || 0;
  const leave = adminData?.onLeaveToday || 0;

  const presentPercentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header with live refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Company Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time workforce attendance, tardiness rates, and leave tracking
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchSummary} className="gap-1.5 self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          Refresh Stats
        </Button>
      </div>

      {/* 5 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Employees"
          value={total}
          subtitle="All active staff members"
          icon={Users}
          colorScheme="blue"
        />

        <MetricCard
          title="Present Today"
          value={present}
          subtitle={`${presentPercentage}% workforce attendance`}
          icon={UserCheck}
          colorScheme="emerald"
        />

        <MetricCard
          title="Late Today"
          value={late}
          subtitle="Clocked in after 09:00 WIB"
          icon={ClockAlert}
          colorScheme="amber"
        />

        <MetricCard
          title="Absent Today"
          value={absent}
          subtitle="Recorded unexcused absence"
          icon={UserX}
          colorScheme="rose"
        />

        <MetricCard
          title="On Leave Today"
          value={leave}
          subtitle="Approved leave coverage"
          icon={CalendarOff}
          colorScheme="indigo"
        />
      </div>

      {/* Main Grid: Live Attendance Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <AttendanceChart />
      </div>

      {/* Secondary Grid: Recent Attendance Live Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <RecentAttendance />
      </div>
    </div>
  );
}
