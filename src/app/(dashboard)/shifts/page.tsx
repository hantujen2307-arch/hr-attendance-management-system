'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShiftMasterRecord, EmployeeScheduleRecord } from '@/types';
import { ShiftTable } from '@/components/shifts/ShiftTable';
import { ScheduleTable } from '@/components/shifts/ScheduleTable';
import { AddShiftModal } from '@/components/shifts/AddShiftModal';
import { EditShiftModal } from '@/components/shifts/EditShiftModal';
import { DeactivateShiftModal } from '@/components/shifts/DeactivateShiftModal';
import { AssignShiftModal } from '@/components/shifts/AssignShiftModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { cn } from '@/lib/utils';
import {
  Clock,
  Plus,
  CalendarCheck,
  RefreshCw,
  Search,
  Filter,
  Moon,
  Layers,
  Users,
  Calendar,
} from 'lucide-react';

export default function ShiftsPage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'master' | 'schedules'>('master');

  // Check current role & personal schedule
  const [mySchedule, setMySchedule] = useState<any>(null);
  const [loadingMySchedule, setLoadingMySchedule] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user || data?.data || data;
        if (u?.role) {
          setCurrentRole(u.role);
          if (u.role === 'EMPLOYEE') {
            setLoadingMySchedule(true);
            fetch('/api/shifts/my-schedule')
              .then((res) => (res.ok ? res.json() : null))
              .then((sched) => setMySchedule(sched))
              .catch(() => {})
              .finally(() => setLoadingMySchedule(false));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Master shifts data
  const [shifts, setShifts] = useState<ShiftMasterRecord[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  // Schedules data
  const [schedules, setSchedules] = useState<EmployeeScheduleRecord[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleTotal, setScheduleTotal] = useState(0);

  // Departments for filters
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Master Shift filters
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftStatusFilter, setShiftStatusFilter] = useState('all');

  // Schedule filters
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleDeptFilter, setScheduleDeptFilter] = useState('all');
  const [scheduleShiftFilter, setScheduleShiftFilter] = useState('all');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('all');
  const [scheduleDateFilter, setScheduleDateFilter] = useState('');
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleLimit, setScheduleLimit] = useState(25);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editShiftTarget, setEditShiftTarget] = useState<ShiftMasterRecord | null>(null);
  const [confirmDeactivateTarget, setConfirmDeactivateTarget] = useState<{
    shift: ShiftMasterRecord;
    mode: 'deactivate' | 'activate';
  } | null>(null);

  // 1. Fetch Master Shifts
  const fetchShifts = useCallback(async () => {
    try {
      setLoadingShifts(true);
      const res = await fetch('/api/shifts');
      if (res.ok) {
        const data = await res.json();
        setShifts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching master shifts:', err);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  // 2. Fetch Employee Schedules
  const fetchSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      const params = new URLSearchParams();
      params.set('page', String(schedulePage));
      params.set('limit', String(scheduleLimit));

      if (scheduleSearch.trim()) params.set('search', scheduleSearch.trim());
      if (scheduleDeptFilter !== 'all') params.set('departmentId', scheduleDeptFilter);
      if (scheduleShiftFilter !== 'all') params.set('shiftId', scheduleShiftFilter);
      if (scheduleStatusFilter !== 'all') params.set('status', scheduleStatusFilter);
      if (scheduleDateFilter) params.set('date', scheduleDateFilter);

      const res = await fetch(`/api/shifts/assignments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(Array.isArray(data.data) ? data.data : []);
        setScheduleTotal(data.meta?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  }, [
    schedulePage,
    scheduleLimit,
    scheduleSearch,
    scheduleDeptFilter,
    scheduleShiftFilter,
    scheduleStatusFilter,
    scheduleDateFilter,
  ]);

  // Fetch departments for dropdown
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
    fetchDepartments();
  }, [fetchShifts, fetchDepartments]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const reloadAll = () => {
    fetchShifts();
    fetchSchedules();
  };

  const handleDeleteSchedule = async (schedule: EmployeeScheduleRecord) => {
    if (
      !confirm(
        `Batalkan penugasan shift ${schedule.shift.name} untuk ${schedule.employee.firstName} ${schedule.employee.lastName}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/shifts/assignments/${schedule.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSchedules();
      } else {
        alert('Gagal membatalkan jadwal shift');
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Terjadi kesalahan sistem');
    }
  };

  // Filtered shifts for search and status
  const filteredShifts = shifts.filter((s) => {
    const matchesSearch =
      !shiftSearch.trim() ||
      s.name.toLowerCase().includes(shiftSearch.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(shiftSearch.toLowerCase()));

    const matchesStatus =
      shiftStatusFilter === 'all' || s.status === shiftStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate live KPI stats
  const totalShiftsCount = shifts.length;
  const activeShiftsCount = shifts.filter((s) => s.status === 'ACTIVE').length;
  const overnightShiftsCount = shifts.filter((s) => s.isOvernight).length;
  if (currentRole === 'EMPLOYEE') {
    const shiftData = mySchedule?.shift;
    const scheduleInfo = mySchedule?.schedule;
    const hasSpecific = mySchedule?.hasSpecificSchedule;

    return (
      <div className="space-y-6 max-w-4xl pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Shift Kerja Saya
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Informasi jadwal dan jam kerja operasional aktif yang ditugaskan kepada Anda.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadingMySchedule(true);
              fetch('/api/shifts/my-schedule')
                .then((res) => (res.ok ? res.json() : null))
                .then((sched) => setMySchedule(sched))
                .finally(() => setLoadingMySchedule(false));
            }}
            disabled={loadingMySchedule}
            className="gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", loadingMySchedule && "animate-spin")} />
            Segarkan Jadwal
          </Button>
        </div>

        {loadingMySchedule ? (
          <div className="h-64 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Memuat jadwal shift kerja Anda...</span>
            </div>
          </div>
        ) : shiftData ? (
          <div className="space-y-6">
            {/* Main Active Shift Card */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white via-blue-50/20 to-white p-6 shadow-xs relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                      {shiftData.code || 'REGULAR'}
                    </span>
                    {hasSpecific ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                        Jadwal Khusus Periode
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        Shift Standar Karyawan
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">
                    {shiftData.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {hasSpecific && scheduleInfo
                      ? `Berlaku dari tanggal ${scheduleInfo.startDate} sampai ${scheduleInfo.endDate}`
                      : 'Shift reguler harian yang aktif untuk operasional Anda'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Jam Masuk & Pulang</div>
                    <div className="text-xl font-extrabold text-blue-600">
                      {shiftData.startTime} - {shiftData.endTime} WIB
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Jam Kerja
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {shiftData.startTime} - {shiftData.endTime}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {shiftData.isOvernight ? 'Shift Lintas Hari' : 'Hari yang sama'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <CalendarCheck className="h-4 w-4 text-amber-600" />
                    Toleransi Terlambat
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {shiftData.toleranceMinutes ?? 15} Menit
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lewat toleransi dihitung terlambat
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Waktu Istirahat
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {shiftData.breakMinutes ?? 60} Menit
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Jeda istirahat operasional
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Moon className="h-4 w-4 text-indigo-600" />
                    Tipe Shift
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {shiftData.isOvernight ? 'Overnight (Malam)' : 'Reguler Siang'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {shiftData.isOvernight ? 'Hingga keesokan hari' : 'Selesai di hari berjalan'}
                  </div>
                </div>
              </div>

              {/* Notice footer */}
              <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-blue-900">
                  Untuk permohonan penyesuaian jadwal atau perubahan shift kerja, silakan hubungi bagian HR perusahaan.
                </p>
                <a
                  href="/attendance"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Ke Presensi Harian →
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
            <Clock className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Belum Ada Shift Ditugaskan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Anda saat ini mengikuti jam operasional default kantor (08:00 - 17:00 WIB). Hubungi HR jika memerlukan pengaturan jadwal khusus.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              JADWAL & SHIFT KERJA
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi master shift operasional, durasi istirahat, toleransi keterlambatan, dan penugasan jadwal kerja karyawan.
          </p>
        </div>

        {/* Action Buttons: [ + TAMBAH SHIFT ], [ ASSIGN SHIFT ], [ REFRESH ] */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reloadAll}
            className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
            title="Muat ulang data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAssignModalOpen(true)}
            className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-blue-600" />
            ASSIGN SHIFT
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            + TAMBAH SHIFT
          </Button>
        </div>
      </div>

      {/* 4 KPI Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Shift
            </span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">
            {totalShiftsCount}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Roster terdaftar</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Shift Aktif
            </span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1.5">
            {activeShiftsCount}
          </h3>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Siap ditugaskan</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Shift Overnight
            </span>
            <Moon className="h-4 w-4 text-indigo-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1.5">
            {overnightShiftsCount}
          </h3>
          <p className="text-[11px] text-indigo-600/80 mt-0.5">Lintas hari / malam</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Jadwal Ditugaskan
            </span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">
            {scheduleTotal}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Penugasan aktif</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'master'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="h-4 w-4" />
            MASTER SHIFT
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
              {shifts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'schedules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            JADWAL KARYAWAN
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
              {scheduleTotal}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: MASTER SHIFT CONTENT */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Master Shift Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode shift..."
                value={shiftSearch}
                onChange={(e) => setShiftSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Filter className="h-3 w-3 text-slate-400" /> Status:
              </span>
              <select
                value={shiftStatusFilter}
                onChange={(e) => setShiftStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Master Shift Table */}
          <ShiftTable
            shifts={filteredShifts}
            loading={loadingShifts}
            onEdit={(shift) => setEditShiftTarget(shift)}
            onDeactivate={(shift) => setConfirmDeactivateTarget({ shift, mode: 'deactivate' })}
            onActivate={(shift) => setConfirmDeactivateTarget({ shift, mode: 'activate' })}
            onAddNew={() => setIsAddModalOpen(true)}
          />
        </div>
      )}

      {/* TAB 2: JADWAL KARYAWAN CONTENT */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Schedules Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Search Nama / NIP */}
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan atau NIP..."
                  value={scheduleSearch}
                  onChange={(e) => {
                    setScheduleSearch(e.target.value);
                    setSchedulePage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Filter Departemen */}
              <div>
                <select
                  value={scheduleDeptFilter}
                  onChange={(e) => {
                    setScheduleDeptFilter(e.target.value);
                    setSchedulePage(1);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Semua Unit Kerja</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Shift */}
              <div>
                <select
                  value={scheduleShiftFilter}
                  onChange={(e) => {
                    setScheduleShiftFilter(e.target.value);
                    setSchedulePage(1);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Semua Shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code || 'SFT'}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <select
                  value={scheduleStatusFilter}
                  onChange={(e) => {
                    setScheduleStatusFilter(e.target.value);
                    setSchedulePage(1);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Cek Jadwal pada Tanggal:</span>
                <input
                  type="date"
                  value={scheduleDateFilter}
                  onChange={(e) => {
                    setScheduleDateFilter(e.target.value);
                    setSchedulePage(1);
                  }}
                  className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700"
                />
                {scheduleDateFilter && (
                  <button
                    type="button"
                    onClick={() => setScheduleDateFilter('')}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset Tanggal
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Tampilkan per halaman:</span>
                <select
                  value={scheduleLimit}
                  onChange={(e) => {
                    setScheduleLimit(Number(e.target.value));
                    setSchedulePage(1);
                  }}
                  className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <ScheduleTable
            schedules={schedules}
            loading={loadingSchedules}
            onDeleteSchedule={handleDeleteSchedule}
            onAssignNew={() => setIsAssignModalOpen(true)}
          />
        </div>
      )}

      {/* Add Master Shift Modal */}
      <AddShiftModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={reloadAll}
      />

      {/* Edit Master Shift Modal */}
      <EditShiftModal
        isOpen={Boolean(editShiftTarget)}
        onClose={() => setEditShiftTarget(null)}
        onSuccess={reloadAll}
        shift={editShiftTarget}
      />

      {/* Deactivate / Activate Shift Confirmation Modal */}
      <DeactivateShiftModal
        isOpen={Boolean(confirmDeactivateTarget)}
        onClose={() => setConfirmDeactivateTarget(null)}
        onSuccess={reloadAll}
        shift={confirmDeactivateTarget?.shift || null}
        mode={confirmDeactivateTarget?.mode || 'deactivate'}
      />

      {/* Assign Shift to Employee Modal */}
      <AssignShiftModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={fetchSchedules}
        shifts={shifts}
      />
    </div>
  );
}
