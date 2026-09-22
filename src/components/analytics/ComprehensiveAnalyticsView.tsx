'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnalyticsOverviewCards } from './AnalyticsOverviewCards';
import { AnalyticsCharts } from './AnalyticsCharts';
import { DepartmentBreakdownTable } from './DepartmentBreakdownTable';
import { EmployeePersonalAnalytics } from './EmployeePersonalAnalytics';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import {
  BarChart3,
  RefreshCw,
  Filter,
  Calendar,
  Building2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface ComprehensiveAnalyticsViewProps {
  departments?: Array<{ id: string; name: string }>;
}

export const ComprehensiveAnalyticsView: React.FC<ComprehensiveAnalyticsViewProps> = ({
  departments = [],
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States
  const [periodPreset, setPeriodPreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (periodPreset !== 'custom') {
        params.set('period', periodPreset);
      } else {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      if (selectedDepartment && selectedDepartment !== 'all') {
        params.set('departmentId', selectedDepartment);
      }

      const res = await fetch(`/api/reports/analytics?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memuat data analitik HR');
      }

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error('Fetch analytics error:', err);
      setErrorMessage(err.message || 'Tidak dapat memuat data analitik HR');
    } finally {
      setIsLoading(false);
    }
  }, [periodPreset, startDate, endDate, selectedDepartment]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Loading skeleton
  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-14 rounded-xl bg-white border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
          <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage && !data) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto my-12 space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Gagal Mengambil Data Analitik</h3>
        <p className="text-xs text-rose-700">{errorMessage}</p>
        <Button variant="primary" size="sm" onClick={fetchAnalytics} className="gap-1.5 mt-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  // If user is EMPLOYEE, render employee personal analytics dashboard
  if (data?.isEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              Analitik Kinerja Pribadi
            </h3>
            <p className="text-xs text-slate-500">
              Periode: {data.period?.startDate} s/d {data.period?.endDate}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-1.5 self-start sm:self-auto">
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Refresh
          </Button>
        </div>

        <EmployeePersonalAnalytics data={data} />
      </div>
    );
  }

  // ADMIN / HR Executive Analytics Dashboard
  return (
    <div className="space-y-6">
      {/* Analytics Filter Toolbar */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Filter Analitik
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Preset Period Select */}
              <div className="w-40">
                <Select
                  value={periodPreset}
                  onChange={(e) => setPeriodPreset(e.target.value)}
                  options={[
                    { value: 'this_month', label: 'Bulan Ini' },
                    { value: 'last_month', label: 'Bulan Lalu' },
                    { value: 'last_3_months', label: '3 Bulan Terakhir' },
                    { value: 'year_to_date', label: 'Tahun Berjalan (YTD)' },
                    { value: 'custom', label: 'Kustom Tanggal' },
                  ]}
                />
              </div>

              {/* Custom Date Inputs if preset is custom */}
              {periodPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-36 text-xs h-9"
                  />
                  <span className="text-xs text-slate-400">s/d</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-36 text-xs h-9"
                  />
                </div>
              )}

              {/* Department Dropdown */}
              <div className="w-48">
                <Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  options={[
                    { value: 'all', label: 'Semua Departemen' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                className="gap-1.5 text-xs font-semibold"
                title="Refresh Data Analitik"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 7 Metric Overview Cards */}
      <AnalyticsOverviewCards data={data} />

      {/* Visual Analytics Charts (Attendance Trend, Recruitment Funnel, Reimbursement Categories, Shifts & Leaves) */}
      <AnalyticsCharts data={data} />

      {/* Department Comparison Breakdown Table */}
      <DepartmentBreakdownTable departments={data.departmentBreakdown || []} />
    </div>
  );
};
