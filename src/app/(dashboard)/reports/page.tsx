'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportTable, ReportAttendanceRow } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { AttendanceDetailModal } from '@/components/attendance/AttendanceDetailModal';
import { ComprehensiveAnalyticsView } from '@/components/analytics/ComprehensiveAnalyticsView';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';
import { AccessDenied } from '@/components/ui/AccessDenied';
import {
  BarChart3,
  Users,
  CalendarCheck,
  ClockAlert,
  CalendarOff,
  UserX,
  FileSpreadsheet,
  Briefcase,
  HeartPulse,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Printer,
  FileText,
  Timer,
  TrendingUp,
  PieChart,
} from 'lucide-react';

interface SummaryData {
  totalEmployees: number;
  totalWorkingDays: number;
  present: number;
  late: number;
  leave: number;
  sick: number;
  businessTrip: number;
  absent: number;
  totalRecords: number;
}

interface MonthlyRecapItem {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  present: number;
  late: number;
  izin: number;
  cuti: number;
  sick: number;
  businessTrip: number;
  absent: number;
  totalWorkingDays: number;
  totalLogged: number;
}

interface DepartmentRecapItem {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  present: number;
  late: number;
  izin: number;
  cuti: number;
  sick: number;
  businessTrip: number;
  absent: number;
}

export default function ReportsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active View Tab: 'analytics' | 'daily' | 'monthly' | 'employee' | 'department' | 'overtime'
  const [activeTab, setActiveTab] = useState<'analytics' | 'daily' | 'monthly' | 'employee' | 'department' | 'overtime'>('analytics');

  // Overtime Report Data
  const [overtimeReport, setOvertimeReport] = useState<{ summary: any; records: any[] } | null>(null);
  const [loadingOvertime, setLoadingOvertime] = useState(false);

  // Filter States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<string>('attendanceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dropdown Options
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; employeeId: string; firstName: string; lastName: string }[]>([]);

  // Daily Report Data
  const [records, setRecords] = useState<ReportAttendanceRow[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalEmployees: 0,
    totalWorkingDays: 0,
    present: 0,
    late: 0,
    leave: 0,
    sick: 0,
    businessTrip: 0,
    absent: 0,
    totalRecords: 0,
  });

  // Monthly Recap Data
  const [monthlyRecap, setMonthlyRecap] = useState<MonthlyRecapItem[]>([]);
  const [departmentRecap, setDepartmentRecap] = useState<DepartmentRecapItem[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  // Individual Employee Report
  const [employeeReport, setEmployeeReport] = useState<any | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal State
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<any | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('Failed to load user profile in reports:', err);
      }
    };
    fetchMe();
  }, []);

  // Fetch departments & employees
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/employees'),
        ]);
        if (deptRes.ok) {
          const d = await deptRes.json();
          setDepartments(Array.isArray(d) ? d : []);
        }
        if (empRes.ok) {
          const e = await empRes.json();
          setEmployees(Array.isArray(e) ? e : e.data || []);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Build query string based on filters
  const buildQueryString = useCallback(
    (pageOverride?: number) => {
      const params = new URLSearchParams();
      params.set('page', String(pageOverride || page));
      params.set('limit', String(limit));
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      if (startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else {
        params.set('month', String(selectedMonth));
        params.set('year', String(selectedYear));
      }

      if (selectedDepartment !== 'all') {
        params.set('departmentId', selectedDepartment);
      }
      if (selectedEmployee !== 'all') {
        params.set('employeeId', selectedEmployee);
      }
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      return params.toString();
    },
    [
      page,
      limit,
      sortBy,
      sortOrder,
      startDate,
      endDate,
      selectedMonth,
      selectedYear,
      selectedDepartment,
      selectedEmployee,
      selectedStatus,
      searchQuery,
    ]
  );

  // Fetch all report data
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const qStr = buildQueryString();

      // Fetch daily attendance report
      const attRes = await fetch(`/api/reports/attendance?${qStr}`);
      if (!attRes.ok) {
        throw new Error('Gagal memuat data laporan absensi');
      }
      const attData = await attRes.json();

      setRecords(attData.data || []);
      setSummary(attData.summary || {});
      setTotal(attData.meta?.total || 0);
      setTotalPages(attData.meta?.totalPages || 1);

      // Fetch monthly recap
      const recapRes = await fetch(`/api/reports/recap?${qStr}`);
      if (recapRes.ok) {
        const rData = await recapRes.json();
        setMonthlyRecap(rData.recap || []);
      }

      // Fetch department recap
      const deptRes = await fetch(`/api/reports/departments?${qStr}`);
      if (deptRes.ok) {
        const dData = await deptRes.json();
        setDepartmentRecap(dData.departments || []);
      }

      // Fetch trend data
      const trendRes = await fetch(`/api/reports/trend?${qStr}`);
      if (trendRes.ok) {
        const tData = await trendRes.json();
        setTrendData(tData.trend || []);
      }

      // Fetch overtime report
      const otRes = await fetch(`/api/reports/overtime?${qStr}`);
      if (otRes.ok) {
        const otData = await otRes.json();
        setOvertimeReport(otData);
      }

      // If specific employee selected, fetch individual employee analytics
      if (selectedEmployee !== 'all') {
        const empUrl = `/api/reports/employee/${selectedEmployee}?${qStr}`;
        const empRes = await fetch(empUrl);
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployeeReport(empData);
        }
      } else {
        setEmployeeReport(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat laporan');
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, selectedEmployee]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    const cur = new Date();
    setSelectedMonth(cur.getMonth() + 1);
    setSelectedYear(cur.getFullYear());
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('all');
    setSelectedEmployee('all');
    setSelectedStatus('all');
    setSearchQuery('');
    setPage(1);
  };

  // Export Excel / CSV
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const qStr = buildQueryString();
      const endpoint =
        activeTab === 'overtime'
          ? `/api/reports/overtime/export?${qStr}`
          : activeTab === 'monthly'
          ? `/api/reports/recap/export?${qStr}`
          : `/api/reports/attendance/export?${qStr}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Gagal mengunduh file laporan');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        activeTab === 'overtime'
          ? `laporan-lembur-${new Date().toISOString().split('T')[0]}.csv`
          : activeTab === 'monthly'
          ? `rekap-bulanan-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
          : `rekap-harian-absensi-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal membuat file laporan. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger Print (uses @media print)
  const handlePrint = () => {
    window.print();
  };

  const isEmployeeRole = currentUser?.role === 'EMPLOYEE';

  if (isEmployeeRole) {
    return (
      <AccessDenied
        title="Akses Rekap & Laporan Dibatasi"
        message="Laporan komprehensif kehadiran seluruh staf, rekapitulasi bulanan departemen, dan HR analytics hanya dapat diakses oleh Administrator dan HR."
        requiredRole="ADMIN / HR"
        suggestedPath="/attendance"
        suggestedLabel="Buka Riwayat Absensi Saya"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                REKAP & LAPORAN ABSENSI
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Laporan komprehensif kehadiran, rekapitulasi bulanan, statistik divisi, dan analisis tren
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReportData}
            isLoading={isLoading}
            className="gap-1.5 text-xs text-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Segarkan
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            isLoading={isExporting}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs font-medium text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak / PDF
          </Button>
        </div>
      </div>

      {/* 2. Formal Print Header (Visible ONLY during print) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-wider uppercase text-slate-900">
          LAPORAN REKAPITULASI ABSENSI KARYAWAN
        </h1>
        <p className="text-sm font-semibold text-slate-700 mt-1">Enterprise HR & Attendance System</p>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-300">
          <span>
            Periode: <strong>{startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : `Bulan ${selectedMonth} / ${selectedYear}`}</strong>
          </span>
          <span>
            Dicetak: {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'medium' }).format(new Date())} WIB
          </span>
          <span>
            Oleh: <strong>{currentUser?.employee ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}` : currentUser?.email || 'Administrator'}</strong>
          </span>
        </div>
      </div>

      {/* 3. 9 KPI Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
        {/* Total Karyawan */}
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Staff
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
            {summary.totalEmployees}
          </span>
          <span className="text-[10px] text-slate-500">Karyawan Aktif</span>
        </div>

        {/* Total Hari Kerja */}
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Hari Kerja
          </span>
          <span className="text-xl font-bold text-blue-600 font-mono mt-0.5 block">
            {summary.totalWorkingDays}
          </span>
          <span className="text-[10px] text-slate-500">Senin - Jumat</span>
        </div>

        {/* Hadir */}
        <div className="p-3 bg-white border border-emerald-200/80 bg-emerald-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Hadir
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono mt-0.5 block">
            {summary.present}
          </span>
          <span className="text-[10px] text-emerald-600">Tepat Waktu</span>
        </div>

        {/* Terlambat */}
        <div className="p-3 bg-white border border-amber-200/80 bg-amber-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">
            Terlambat
          </span>
          <span className="text-xl font-bold text-amber-700 font-mono mt-0.5 block">
            {summary.late}
          </span>
          <span className="text-[10px] text-amber-600">&gt; Toleransi</span>
        </div>

        {/* Izin */}
        <div className="p-3 bg-white border border-blue-200/80 bg-blue-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
            Izin
          </span>
          <span className="text-xl font-bold text-blue-700 font-mono mt-0.5 block">
            {summary.leave}
          </span>
          <span className="text-[10px] text-blue-600">Disetujui</span>
        </div>

        {/* Sakit */}
        <div className="p-3 bg-white border border-indigo-200/80 bg-indigo-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Sakit
          </span>
          <span className="text-xl font-bold text-indigo-700 font-mono mt-0.5 block">
            {summary.sick}
          </span>
          <span className="text-[10px] text-indigo-600">Surat Dokter</span>
        </div>

        {/* Dinas */}
        <div className="p-3 bg-white border border-purple-200/80 bg-purple-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">
            Dinas
          </span>
          <span className="text-xl font-bold text-purple-700 font-mono mt-0.5 block">
            {summary.businessTrip}
          </span>
          <span className="text-[10px] text-purple-600">Surat Tugas</span>
        </div>

        {/* Cuti (derived from notes count) */}
        <div className="p-3 bg-white border border-teal-200/80 bg-teal-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider block">
            Cuti
          </span>
          <span className="text-xl font-bold text-teal-700 font-mono mt-0.5 block">
            {monthlyRecap.reduce((acc, r) => acc + r.cuti, 0)}
          </span>
          <span className="text-[10px] text-teal-600">Hak Cuti</span>
        </div>

        {/* Alpha */}
        <div className="p-3 bg-white border border-rose-200/80 bg-rose-50/20 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider block">
            Alpha
          </span>
          <span className="text-xl font-bold text-rose-700 font-mono mt-0.5 block">
            {summary.absent}
          </span>
          <span className="text-[10px] text-rose-600">Tanpa Berita</span>
        </div>
      </div>

      {/* 4. Filter Component */}
      <ReportFilters
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        selectedEmployee={selectedEmployee}
        onEmployeeChange={setSelectedEmployee}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        departments={departments}
        employees={employees}
        onApplyFilters={fetchReportData}
        onReset={handleResetFilters}
        onExportExcel={handleExportExcel}
        onExportPdf={handlePrint}
        onPrint={handlePrint}
        isExporting={isExporting}
        isEmployeeRole={isEmployeeRole}
      />

      {/* 5. Visual Charts (Presence Statistics & Trend Timeline) */}
      <ReportChart summary={summary} trendData={trendData} isLoading={isLoading} />

      {/* 6. Navigation Tabs (5 Modes) */}
      <div className="flex items-center gap-1 border-b border-slate-200 print:hidden overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Eksekutif HR Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'daily'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekap Harian ({total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekap Bulanan per Karyawan ({monthlyRecap.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('department')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'department'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekap per Unit Kerja ({departmentRecap.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overtime'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekap Lembur ({overtimeReport?.records?.length || 0})
        </button>

        {selectedEmployee !== 'all' && (
          <button
            type="button"
            onClick={() => setActiveTab('employee')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'employee'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Profil &amp; Riwayat Karyawan
          </button>
        )}
      </div>

      {/* Error State with Retry */}
      {errorMessage && activeTab !== 'analytics' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReportData} className="text-xs h-7">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* 7. Tab Content: Eksekutif HR Analytics */}
      {activeTab === 'analytics' && (
        <ComprehensiveAnalyticsView departments={departments} />
      )}

      {/* 8. Tab 1 Content: Rekap Harian */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <ReportTable
            records={records}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onViewDetail={(row) => setSelectedDetailRecord(row)}
          />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 text-xs text-slate-500 print:hidden">
            <div className="flex items-center gap-2">
              <span>
                Menampilkan <strong>{records.length > 0 ? (page - 1) * limit + 1 : 0}</strong>–
                <strong>{Math.min(page * limit, total)}</strong> dari <strong>{total}</strong> data
              </span>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5">
                <span>Baris per halaman:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium text-slate-700">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Tab 2 Content: Rekap Bulanan per Karyawan */}
      {activeTab === 'monthly' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Unit Kerja</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead className="text-center font-bold text-emerald-700">Hadir</TableHead>
                  <TableHead className="text-center font-bold text-amber-700">Terlambat</TableHead>
                  <TableHead className="text-center font-bold text-blue-700">Izin</TableHead>
                  <TableHead className="text-center font-bold text-teal-700">Cuti</TableHead>
                  <TableHead className="text-center font-bold text-indigo-700">Sakit</TableHead>
                  <TableHead className="text-center font-bold text-purple-700">Dinas</TableHead>
                  <TableHead className="text-center font-bold text-rose-700">Alpha</TableHead>
                  <TableHead className="text-center font-bold">Total Hari Kerja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRecap.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-xs text-slate-400">
                      Tidak ada data rekap bulanan untuk kriteria ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyRecap.map((emp, i) => (
                    <TableRow key={emp.id} className="hover:bg-slate-50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">{i + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">{emp.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{emp.employeeId}</TableCell>
                      <TableCell className="text-xs text-slate-600">{emp.department}</TableCell>
                      <TableCell className="text-xs text-slate-500">{emp.position}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                        {emp.present}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-amber-700 bg-amber-50/40">
                        {emp.late}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-blue-700 bg-blue-50/40">
                        {emp.izin}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-teal-700 bg-teal-50/40">
                        {emp.cuti}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {emp.sick}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-purple-700 bg-purple-50/40">
                        {emp.businessTrip}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                        {emp.absent}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-slate-900">
                        {emp.totalWorkingDays}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 9. Tab 3 Content: Rekap per Karyawan (Profil & Riwayat) */}
      {activeTab === 'employee' && employeeReport && (
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                {employeeReport.employee?.name?.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{employeeReport.employee?.name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                    NIP: {employeeReport.employee?.employeeId}
                  </span>
                  <span>•</span>
                  <span>{employeeReport.employee?.department || 'Umum'}</span>
                  <span>•</span>
                  <span>{employeeReport.employee?.position || 'Staff'}</span>
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6">
              <span className="text-xs text-slate-400 block font-medium">Akumulasi Jam Kerja</span>
              <span className="text-2xl font-bold font-mono text-blue-600 mt-0.5 block">
                {Math.floor((employeeReport.workingMinutes || 0) / 60)}j {(employeeReport.workingMinutes || 0) % 60}m
              </span>
            </div>
          </div>

          {/* Individual History Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Pulang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(employeeReport.records || []).map((r: any, i: number) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-center font-mono text-xs text-slate-500">{i + 1}</TableCell>
                    <TableCell className="font-medium text-xs text-slate-800">{formatDate(r.date)}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-800">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === 'PRESENT'
                            ? 'success'
                            : r.status === 'LATE'
                            ? 'warning'
                            : r.status === 'LEAVE'
                            ? 'info'
                            : 'danger'
                        }
                        dot
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {r.workingMinutes ? `${Math.floor(r.workingMinutes / 60)}j ${r.workingMinutes % 60}m` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{r.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 10. Tab 4 Content: Rekap per Unit Kerja */}
      {activeTab === 'department' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentRecap.map((d) => (
              <Card key={d.departmentId} className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{d.departmentName}</span>
                    </div>
                    <Badge variant="default" className="text-[10px]">
                      {d.totalEmployees} Karyawan
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <span className="text-emerald-700 font-bold block text-sm">{d.present}</span>
                      <span className="text-[10px] text-emerald-600">Hadir</span>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <span className="text-amber-700 font-bold block text-sm">{d.late}</span>
                      <span className="text-[10px] text-amber-600">Terlambat</span>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-bold block text-sm">{d.izin + d.cuti}</span>
                      <span className="text-[10px] text-blue-600">Izin/Cuti</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <span className="text-indigo-700 font-bold block text-sm">{d.sick}</span>
                      <span className="text-[10px] text-indigo-600">Sakit</span>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <span className="text-purple-700 font-bold block text-sm">{d.businessTrip}</span>
                      <span className="text-[10px] text-purple-600">Dinas</span>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-lg">
                      <span className="text-rose-700 font-bold block text-sm">{d.absent}</span>
                      <span className="text-[10px] text-rose-600">Alpha</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 10. Overtime Report Tab View */}
      {activeTab === 'overtime' && (
        <div className="space-y-6">
          {/* Overtime KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium block">Total Pengajuan Lembur</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {overtimeReport?.summary?.totalRequests || 0}
              </span>
              <span className="text-[11px] text-slate-400">
                {overtimeReport?.summary?.pendingCount || 0} Menunggu Approval
              </span>
            </Card>

            <Card className="p-4 border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium block">Total Menit Diajukan</span>
              <span className="text-2xl font-bold text-indigo-600 mt-1 block">
                {overtimeReport?.summary?.totalRequestedMinutes || 0}m
              </span>
              <span className="text-[11px] text-indigo-400">
                {Math.floor((overtimeReport?.summary?.totalRequestedMinutes || 0) / 60)} Jam {(overtimeReport?.summary?.totalRequestedMinutes || 0) % 60} Menit
              </span>
            </Card>

            <Card className="p-4 border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium block">Total Menit Disetujui</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                {overtimeReport?.summary?.totalApprovedMinutes || 0}m
              </span>
              <span className="text-[11px] text-emerald-500">
                {overtimeReport?.summary?.approvedCount || 0} Pengajuan Disetujui
              </span>
            </Card>

            <Card className="p-4 border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium block">Realisasi Menit Aktual</span>
              <span className="text-2xl font-bold text-blue-600 mt-1 block">
                {overtimeReport?.summary?.totalActualMinutes || 0}m
              </span>
              <span className="text-[11px] text-blue-400">Berdasarkan data absensi</span>
            </Card>
          </div>

          {/* Overtime Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Daftar Rekapitulasi Pengajuan Lembur
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="text-xs h-8 border-slate-200 text-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Ekspor CSV Lembur
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-3">Departemen</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Shift</th>
                    <th className="py-3 px-3">Jam Rencana</th>
                    <th className="py-3 px-3">Jam Aktual</th>
                    <th className="py-3 px-3">Diajukan</th>
                    <th className="py-3 px-3">Disetujui</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!overtimeReport?.records || overtimeReport.records.length === 0) ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Tidak ada data lembur untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    overtimeReport.records.map((r: any, idx: number) => {
                      const empName = `${r.employee.firstName} ${r.employee.lastName}`;
                      const shiftName = r.schedule?.shift?.name || '-';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            <div>{empName}</div>
                            <div className="text-[10px] text-slate-400">{r.employee.employeeId}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{r.employee.department?.name || '-'}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{r.dateFormatted}</td>
                          <td className="py-2.5 px-3 text-slate-600">{shiftName}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                            {r.plannedStartTime} - {r.plannedEndTime}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-700">
                            {r.actualStartTime && r.actualEndTime
                              ? `${r.actualStartTime} - ${r.actualEndTime}`
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{r.requestedMinutes}m</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">
                            {r.approvedMinutes !== null && r.approvedMinutes !== undefined ? `${r.approvedMinutes}m` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 max-w-[200px] truncate" title={r.reason}>
                            {r.reason}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 11. Modal Detail Absensi */}
      {selectedDetailRecord && (
        <AttendanceDetailModal
          isOpen={!!selectedDetailRecord}
          onClose={() => setSelectedDetailRecord(null)}
          record={
            selectedDetailRecord
              ? {
                  ...selectedDetailRecord,
                  attendanceDate: selectedDetailRecord.date || selectedDetailRecord.attendanceDate,
                  employee:
                    selectedDetailRecord.employee && typeof selectedDetailRecord.employee === 'object'
                      ? selectedDetailRecord.employee
                      : {
                          id: selectedDetailRecord.employeeId || '',
                          employeeId: selectedDetailRecord.employeeId || '',
                          firstName:
                            selectedDetailRecord.employee?.split(' ')[0] || selectedDetailRecord.employee || '',
                          lastName: selectedDetailRecord.employee?.split(' ').slice(1).join(' ') || '',
                          department: { name: selectedDetailRecord.department || 'Umum' },
                          position: selectedDetailRecord.position,
                        },
                }
              : null
          }
        />
      )}
    </div>
  );
}
