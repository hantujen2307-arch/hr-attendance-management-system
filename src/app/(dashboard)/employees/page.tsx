'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { EmployeeRecord, EmployeeStats, PositionMaster } from '@/types';
import { EmployeeStatsCards } from '@/components/employees/EmployeeStatsCards';
import { EmployeeFilters } from '@/components/employees/EmployeeFilters';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { AddEmployeeModal } from '@/components/employees/AddEmployeeModal';
import { EditEmployeeModal } from '@/components/employees/EditEmployeeModal';
import { EmployeeDetailModal } from '@/components/employees/EmployeeDetailModal';
import { DeactivateConfirmModal } from '@/components/employees/DeactivateConfirmModal';
import { ImportEmployeesModal } from '@/components/employees/ImportEmployeesModal';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { Button } from '@/components/ui/Button';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Sparkles,
  UserX,
  CheckCircle2,
} from 'lucide-react';

export default function EmployeesPage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [linkingCurrentAdmin, setLinkingCurrentAdmin] = useState(false);
  const [linkAdminSuccess, setLinkAdminSuccess] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [positions, setPositions] = useState<PositionMaster[]>([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');

  // Loading states
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<EmployeeRecord | null>(null);
  const [editEmployee, setEditEmployee] = useState<EmployeeRecord | null>(null);
  const [confirmEmployee, setConfirmEmployee] = useState<{
    employee: EmployeeRecord;
    mode: 'deactivate' | 'activate';
  } | null>(null);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch current role & master data: departments & positions
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user || data?.data || data;
        if (u) {
          setCurrentUser(u);
          if (u?.role) setCurrentRole(u.role);
        }
      })
      .catch(() => {});

    fetchMasterData();
  }, []);

  const handleAutoLinkCurrentAdmin = async () => {
    try {
      setLinkingCurrentAdmin(true);
      setLinkAdminSuccess(null);
      const res = await fetch('/api/employees/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoProvision: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinkAdminSuccess(data.message || 'Profil karyawan berhasil dihubungkan.');
        if (data.employee) {
          setCurrentUser((prev: any) => ({ ...prev, employee: data.employee }));
        }
        reloadData();
      } else {
        alert(data.message || 'Gagal menghubungkan profil');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal menghubungkan profil');
    } finally {
      setLinkingCurrentAdmin(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [deptRes, posRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/employees/positions'),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : []);
      }
      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(Array.isArray(posData) ? posData : []);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  // Fetch KPI stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/employees/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching employee stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch employee list based on filters
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const params = new URLSearchParams();

      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedDepartment !== 'all') params.set('departmentId', selectedDepartment);
      if (selectedPosition !== 'all') params.set('position', selectedPosition);

      const url = `/api/employees${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [debouncedSearch, selectedStatus, selectedDepartment, selectedPosition]);

  // Run queries on filter changes
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedStatus('all');
    setSelectedDepartment('all');
    setSelectedPosition('all');
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedDepartment !== 'all') params.set('departmentId', selectedDepartment);
      if (selectedPosition !== 'all') params.set('position', selectedPosition);

      const url = `/api/employees/export${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        alert('Gagal mengekspor data karyawan');
        return;
      }

      const blob = await res.blob();
      const dateStr = new Date().toISOString().split('T')[0];
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `data-karyawan-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Terjadi kesalahan saat mengunduh CSV');
    } finally {
      setExporting(false);
    }
  };

  const reloadData = () => {
    fetchEmployees();
    fetchStats();
  };

  if (currentRole === 'EMPLOYEE') {
    return (
      <AccessDenied
        title="Akses Direktori Karyawan Dibatasi"
        message="Halaman data master karyawan dan manajemen personil hanya dapat diakses oleh Administrator dan HR. Untuk melihat dan memperbarui profil data diri Anda, silakan kunjungi menu Profil Saya."
        requiredRole="ADMIN / HR"
        suggestedPath="/employees/profile"
        suggestedLabel="Buka Profil Saya"
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              MANAJEMEN KARYAWAN
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data pegawai, hak akses login, profil jabatan, riwayat absensi, serta pengajuan cuti secara terintegrasi.
          </p>
        </div>

        {/* Action Buttons: [ + TAMBAH KARYAWAN ], [ IMPORT EXCEL ], [ EXPORT EXCEL ] */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reloadData}
            className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
            title="Muat ulang data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            {exporting ? 'Mengekspor...' : 'EXPORT EXCEL'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            IMPORT EXCEL
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs gap-1.5 shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            + TAMBAH KARYAWAN
          </Button>
        </div>
      </div>

      {/* Unlinked Employee Profile Alert Banner */}
      {currentUser && !currentUser.employee && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                Akun Administrator Belum Terhubung ke Profil Karyawan
              </p>
              <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
                Akun login saat ini (<strong>{currentUser.email}</strong>) belum dipasangkan dengan data karyawan di sistem. Untuk dapat melakukan absensi mandiri, buat atau hubungkan profil karyawan sekarang.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAutoLinkCurrentAdmin}
            isLoading={linkingCurrentAdmin}
            className="gap-2 text-xs bg-amber-600 hover:bg-amber-700 font-bold shrink-0 shadow-xs"
          >
            <Sparkles className="h-4 w-4" />
            Hubungkan Akun Saya Otomatis
          </Button>
        </div>
      )}

      {linkAdminSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{linkAdminSuccess}</span>
        </div>
      )}

      {/* 5 KPI Statistics Cards */}
      <EmployeeStatsCards stats={stats} loading={loadingStats} />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <EmployeeFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          selectedPosition={selectedPosition}
          onPositionChange={setSelectedPosition}
          departments={departments}
          positions={positions}
          onReset={handleResetFilters}
        />
      </div>

      {/* Employee List Table / Cards */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-500 px-1">
          <span>
            Menampilkan <strong className="text-slate-800">{employees.length}</strong> karyawan
            {stats ? ` dari total ${stats.totalEmployees} terdaftar` : ''}
          </span>
        </div>

        <EmployeeTable
          employees={employees}
          loading={loadingEmployees}
          onViewDetail={(emp) => setDetailEmployee(emp)}
          onEdit={(emp) => setEditEmployee(emp)}
          onDeactivate={(emp) => setConfirmEmployee({ employee: emp, mode: 'deactivate' })}
          onActivate={(emp) => setConfirmEmployee({ employee: emp, mode: 'activate' })}
          onAddNew={() => setIsAddModalOpen(true)}
        />
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={reloadData}
        departments={departments}
        positions={positions}
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={Boolean(editEmployee)}
        onClose={() => setEditEmployee(null)}
        onSuccess={reloadData}
        employee={editEmployee}
        departments={departments}
        positions={positions}
      />

      {/* Detail Employee Modal (4 Tabs) */}
      <EmployeeDetailModal
        isOpen={Boolean(detailEmployee)}
        onClose={() => setDetailEmployee(null)}
        employee={detailEmployee}
        onEdit={(emp) => setEditEmployee(emp)}
      />

      {/* Deactivate / Activate Confirmation Modal */}
      <DeactivateConfirmModal
        isOpen={Boolean(confirmEmployee)}
        onClose={() => setConfirmEmployee(null)}
        onSuccess={reloadData}
        employee={confirmEmployee?.employee || null}
        mode={confirmEmployee?.mode || 'deactivate'}
      />

      {/* Batch Import Excel Modal */}
      <ImportEmployeesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={reloadData}
        departments={departments}
        positions={positions}
      />
    </div>
  );
}
