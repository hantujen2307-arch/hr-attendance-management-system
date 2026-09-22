'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AttendanceTable, AttendanceRecordItem } from '@/components/attendance/AttendanceTable';
import { AttendanceFilters } from '@/components/attendance/AttendanceFilters';
import { EmployeeCheckInCard } from '@/components/attendance/EmployeeCheckInCard';
import { LogAttendanceModal } from '@/components/attendance/LogAttendanceModal';
import { AttendanceDetailModal } from '@/components/attendance/AttendanceDetailModal';
import { AttendanceMonthlyRecap } from '@/components/attendance/AttendanceMonthlyRecap';
import { AttendanceSettingsSection } from '@/components/settings/AttendanceSettingsSection';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Users,
  UserCheck,
  UserX,
  Building2,
  Calendar,
  Briefcase,
  Thermometer,
} from 'lucide-react';

interface CurrentUserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface TodaySummaryData {
  totalEmployees: number;
  alreadyCheckedIn: number;
  notYetCheckedIn: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  sick: number;
  businessTrip: number;
}

interface OfficeSettingData {
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workStartTime: string;
  toleranceMinutes: number;
  workEndTime: string;
}

export default function AttendancePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'recap' | 'settings'>('monitoring');

  // Today state
  const [todaySummary, setTodaySummary] = useState<TodaySummaryData>({
    totalEmployees: 0,
    alreadyCheckedIn: 0,
    notYetCheckedIn: 0,
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    sick: 0,
    businessTrip: 0,
  });
  const [myTodayAttendance, setMyTodayAttendance] = useState<any>(null);
  const [officeSetting, setOfficeSetting] = useState<OfficeSettingData>({
    locationName: 'Kantor Utama',
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 100,
    workStartTime: '08:00',
    toleranceMinutes: 15,
    workEndTime: '17:00',
  });

  // Table & Filters state
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch current authenticated user
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error('Failed to load user profile in attendance page:', err);
      }
    };
    fetchMe();
  }, []);

  // Fetch departments for filter
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch today summary, self attendance, and office setting
  const fetchTodayData = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await fetch('/api/attendance/today');
      if (res.ok) {
        const jsonResponse = await res.json();
        const data = jsonResponse.data || jsonResponse;
        if (data.summary) {
          setTodaySummary({
            totalEmployees: data.summary.totalEmployees || 0,
            alreadyCheckedIn: data.summary.alreadyCheckedIn || 0,
            notYetCheckedIn: data.summary.notYetCheckedIn || 0,
            present: data.summary.present || 0,
            late: data.summary.late || 0,
            absent: data.summary.absent || 0,
            leave: data.summary.leave || 0,
            sick: data.summary.sick || 0,
            businessTrip: data.summary.businessTrip || 0,
          });
        }
        if (data.setting) {
          setOfficeSetting(data.setting);
        }
        setMyTodayAttendance(data.attendance || null);
      }
    } catch (err) {
      console.error('Failed to fetch today attendance metrics:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  // Fetch paginated attendance records from backend API
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedDate) params.set('date', selectedDate);
      if (selectedDepartment !== 'all') params.set('departmentId', selectedDepartment);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memuat catatan absensi');
      }

      const data = await res.json();
      setRecords(data.data || []);
      if (data.meta) {
        setTotal(data.meta.total || 0);
        setTotalPages(data.meta.totalPages || 1);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Tidak dapat mengambil data absensi');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedDate, selectedDepartment, selectedStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Refresh all state
  const handleRefreshAll = () => {
    fetchTodayData();
    fetchRecords();
  };

  const isEmployeeRole = currentUser?.role === 'EMPLOYEE';
  const canManageAttendance = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR';
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Sistem Absensi Karyawan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Absensi harian terverifikasi GPS, radius lokasi kerja ({officeSetting.radiusMeters}m), dan foto selfie
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManageAttendance && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
              className="gap-1.5 shadow-2xs text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Catat Absensi
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            title="Refresh Data Absensi"
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Refresh
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('settings')}
              className={`gap-1.5 text-xs font-medium ${
                activeTab === 'settings' ? 'bg-blue-50 text-blue-700 border-blue-300' : ''
              }`}
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              Pengaturan Absensi
            </Button>
          )}
        </div>
      </div>

      {/* Admin/HR Navigation Tabs */}
      {canManageAttendance && (
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('monitoring')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'monitoring'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Absensi Hari Ini & Log Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recap')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'recap'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Rekap Absensi Bulanan</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Pengaturan Absensi</span>
            </button>
          )}
        </div>
      )}

      {/* Employee Interactive Check-in Card (Shown to all employees, or Admin/HR who also has employee profile) */}
      {(isEmployeeRole || myTodayAttendance || currentUser?.employee) && (
        <EmployeeCheckInCard
          attendanceRecord={myTodayAttendance}
          officeSetting={officeSetting}
          onRefresh={handleRefreshAll}
        />
      )}

      {/* TAB CONTENT: Settings */}
      {canManageAttendance && activeTab === 'settings' && (
        <div className="space-y-4 max-w-4xl">
          <AttendanceSettingsSection />
        </div>
      )}

      {/* TAB CONTENT: Monthly Recap */}
      {canManageAttendance && activeTab === 'recap' && (
        <div className="space-y-4">
          <AttendanceMonthlyRecap departments={departments} />
        </div>
      )}

      {/* TAB CONTENT: Monitoring & Daily Log (Default) */}
      {(!canManageAttendance || activeTab === 'monitoring') && (
        <div className="space-y-6">
          {/* Admin KPI Monitoring Cards: 9 Cards per Requirement 12 */}
          {canManageAttendance && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  ABSENSI HARI INI
                </h3>
                <span className="text-[11px] text-slate-400">
                  Real-time update • {records.length} data dimuat
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {/* 1. TOTAL KARYAWAN */}
                <Card className="bg-slate-50 border-slate-200 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase truncate">
                      TOTAL
                    </p>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.totalEmployees}
                    </h4>
                  </CardContent>
                </Card>

                {/* 2. SUDAH ABSEN */}
                <Card className="bg-indigo-50/50 border-indigo-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase truncate">
                      SUDAH ABSEN
                    </p>
                    <h4 className="text-lg font-bold text-indigo-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.alreadyCheckedIn}
                    </h4>
                  </CardContent>
                </Card>

                {/* 3. BELUM ABSEN */}
                <Card className="bg-slate-100/70 border-slate-200 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase truncate">
                      BELUM ABSEN
                    </p>
                    <h4 className="text-lg font-bold text-slate-800 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.notYetCheckedIn}
                    </h4>
                  </CardContent>
                </Card>

                {/* 4. HADIR */}
                <Card className="bg-emerald-50 border-emerald-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase truncate">
                      HADIR
                    </p>
                    <h4 className="text-lg font-bold text-emerald-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.present}
                    </h4>
                  </CardContent>
                </Card>

                {/* 5. TERLAMBAT */}
                <Card className="bg-amber-50 border-amber-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-amber-700 uppercase truncate">
                      TERLAMBAT
                    </p>
                    <h4 className="text-lg font-bold text-amber-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.late}
                    </h4>
                  </CardContent>
                </Card>

                {/* 6. IZIN */}
                <Card className="bg-blue-50 border-blue-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-blue-700 uppercase truncate">
                      IZIN
                    </p>
                    <h4 className="text-lg font-bold text-blue-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.leave}
                    </h4>
                  </CardContent>
                </Card>

                {/* 7. SAKIT */}
                <Card className="bg-orange-50 border-orange-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-orange-700 uppercase truncate">
                      SAKIT
                    </p>
                    <h4 className="text-lg font-bold text-orange-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.sick}
                    </h4>
                  </CardContent>
                </Card>

                {/* 8. DINAS */}
                <Card className="bg-purple-50 border-purple-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-purple-700 uppercase truncate">
                      DINAS
                    </p>
                    <h4 className="text-lg font-bold text-purple-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.businessTrip}
                    </h4>
                  </CardContent>
                </Card>

                {/* 9. ALPHA */}
                <Card className="bg-rose-50 border-rose-100 shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold text-rose-700 uppercase truncate">
                      ALPHA
                    </p>
                    <h4 className="text-lg font-bold text-rose-900 mt-0.5">
                      {isSummaryLoading ? '—' : todaySummary.absent}
                    </h4>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {isEmployeeRole ? 'RIWAYAT ABSENSI SAYA' : 'TABEL LOG KEHADIRAN KARYAWAN'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setSearchQuery('');
                  setSelectedDepartment('all');
                  setSelectedStatus('all');
                  setPage(1);
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Reset Filter
              </button>
            </div>

            <AttendanceFilters
              selectedDate={selectedDate}
              onDateChange={(val) => {
                setSelectedDate(val);
                setPage(1);
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedDepartment={selectedDepartment}
              onDepartmentChange={(val) => {
                setSelectedDepartment(val);
                setPage(1);
              }}
              selectedStatus={selectedStatus}
              onStatusChange={(val) => {
                setSelectedStatus(val);
                setPage(1);
              }}
              departments={departments}
            />
          </div>

          {/* Error state */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecords}
                className="border-rose-300 hover:bg-rose-100 text-xs"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Attendance Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-500 px-1">
              <span>
                Menampilkan <strong className="text-slate-800">{records.length}</strong> dari{' '}
                <strong className="text-slate-800">{total}</strong> total data absensi
              </span>
              <span>
                Halaman <strong className="text-slate-800">{page}</strong> dari{' '}
                <strong className="text-slate-800">{totalPages || 1}</strong>
              </span>
            </div>

            <AttendanceTable
              records={records}
              isLoading={isLoading}
              canManage={canManageAttendance}
              startIndex={(page - 1) * limit + 1}
              onViewDetail={async (record) => {
                try {
                  const res = await fetch(`/api/attendance/${record.id}`);
                  if (res.ok) {
                    const fullData = await res.json();
                    setSelectedDetailRecord(fullData);
                  } else {
                    setSelectedDetailRecord(record);
                  }
                } catch {
                  setSelectedDetailRecord(record);
                }
              }}
              onEdit={(record) => {
                setEditingRecord({
                  id: record.id,
                  employeeId: record.employee?.id || '',
                  employeeName: record.employee
                    ? `${record.employee.firstName} ${record.employee.lastName}`
                    : 'Employee',
                  attendanceDate: record.attendanceDate,
                  checkIn: record.checkIn,
                  checkOut: record.checkOut,
                  status: record.status,
                  notes: record.notes,
                });
                setIsAddModalOpen(true);
              }}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 px-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </Button>

                <span className="text-xs text-slate-500">
                  Halaman {page} dari {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="gap-1 text-xs"
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      <LogAttendanceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={handleRefreshAll}
        editRecord={editingRecord}
      />

      {/* Detail Modal with Photos & Interactive Map */}
      <AttendanceDetailModal
        isOpen={!!selectedDetailRecord}
        onClose={() => setSelectedDetailRecord(null)}
        record={selectedDetailRecord}
      />
    </div>
  );
}
