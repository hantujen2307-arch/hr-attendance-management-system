'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Lock,
  DollarSign,
  Layers,
  Settings2,
  Calendar,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PayrollSummaryCards } from '@/components/payroll/PayrollSummaryCards';
import { PayrollTable } from '@/components/payroll/PayrollTable';
import { SalaryMasterTable } from '@/components/payroll/SalaryMasterTable';
import { CreatePeriodModal } from '@/components/payroll/CreatePeriodModal';
import { SalaryMasterModal } from '@/components/payroll/SalaryMasterModal';
import { PayrollSlipModal } from '@/components/payroll/PayrollSlipModal';
import { AdjustRecordModal } from '@/components/payroll/AdjustRecordModal';
import { PayrollPeriod, PayrollRecord, PayrollSummary, UserRole } from '@/types';

export default function PayrollPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Periods state
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [isLoadingPeriods, setIsLoadingPeriods] = useState<boolean>(true);

  // Records & Summary state
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Employees for Master Salary
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);

  // Navigation tabs for HR/Admin
  const [activeTab, setActiveTab] = useState<'records' | 'master'>('records');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifications / Banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [isDownloadingBulkPdf, setIsDownloadingBulkPdf] = useState<boolean>(false);

  // Modals
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState<boolean>(false);
  const [selectedSlipRecord, setSelectedSlipRecord] = useState<PayrollRecord | null>(null);
  const [selectedAdjustRecord, setSelectedAdjustRecord] = useState<PayrollRecord | null>(null);
  const [selectedSalaryEmployee, setSelectedSalaryEmployee] = useState<any | null>(null);

  // 1. Fetch current user session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user || data;
        if (u?.role) {
          setCurrentRole(u.role as UserRole);
          setCurrentUser(u);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch periods
  const fetchPeriods = useCallback(async () => {
    if (currentRole === 'EMPLOYEE') {
      setIsLoadingPeriods(false);
      return;
    }
    setIsLoadingPeriods(true);
    try {
      const res = await fetch('/api/payroll/periods');
      if (res.ok) {
        const json = await res.json();
        const periodList: PayrollPeriod[] = json.data || [];
        setPeriods(periodList);
        if (periodList.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(periodList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch payroll periods:', err);
    } finally {
      setIsLoadingPeriods(false);
    }
  }, [selectedPeriodId, currentRole]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // 3. Fetch records & summary for selected period
  const fetchPayrollData = useCallback(async () => {
    if (!selectedPeriodId && currentRole !== 'EMPLOYEE') return;

    setIsLoadingData(true);
    setErrorBanner(null);

    try {
      const params = new URLSearchParams();
      if (selectedPeriodId) {
        params.append('payrollPeriodId', selectedPeriodId);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '100');

      const [recordsRes, summaryRes] = await Promise.all([
        fetch(`/api/payroll/records?${params.toString()}`),
        selectedPeriodId ? fetch(`/api/payroll/summary?payrollPeriodId=${selectedPeriodId}`) : Promise.resolve(null),
      ]);

      if (recordsRes.ok) {
        const recJson = await recordsRes.json();
        setRecords(recJson.data || []);
      }

      if (summaryRes && summaryRes.ok) {
        const sumJson = await summaryRes.json();
        setSummary(sumJson.data || null);
      }
    } catch (err: any) {
      console.error('Failed to fetch payroll records:', err);
      setErrorBanner(err.message || 'Gagal memuat rekor penggajian');
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedPeriodId, searchQuery, currentRole]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // 4. Fetch employees with salary master (for HR/ADMIN master tab)
  const fetchEmployeesMaster = useCallback(async () => {
    if (currentRole === 'EMPLOYEE') return;
    setIsLoadingEmployees(true);
    try {
      const res = await fetch('/api/payroll/salaries');
      if (res.ok) {
        const json = await res.json();
        setEmployees(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees salary master:', err);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [currentRole]);

  useEffect(() => {
    if (activeTab === 'master') {
      fetchEmployeesMaster();
    }
  }, [activeTab, fetchEmployeesMaster]);

  const activePeriod = periods.find((p) => p.id === selectedPeriodId) || null;

  // Actions for HR/Admin
  const handleGeneratePayroll = async () => {
    if (!selectedPeriodId) return;
    setActionLoading(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await fetch(`/api/payroll/periods/${selectedPeriodId}/calculate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal kalkulasi payroll');

      setSuccessBanner(data.message || 'Kalkulasi payroll berhasil dijalankan');
      fetchPayrollData();
      fetchPeriods();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    if (!selectedPeriodId) return;
    if (!confirm('Kunci dan proses periode payroll ini ke status PROCESSED?')) return;

    setActionLoading(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await fetch(`/api/payroll/periods/${selectedPeriodId}/process`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memproses payroll');

      setSuccessBanner(data.message || 'Periode berhasil diproses');
      fetchPayrollData();
      fetchPeriods();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayPayroll = async () => {
    if (!selectedPeriodId) return;
    if (!confirm('Selesaikan pembayaran payroll ini (PAID)? Seluruh lembur terkait akan ditandai lunas dan slip gaji akan diterbitkan.')) return;

    setActionLoading(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await fetch(`/api/payroll/periods/${selectedPeriodId}/pay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyelesaikan pembayaran');

      setSuccessBanner(data.message || 'Pembayaran payroll selesai dan slip gaji diterbitkan');
      fetchPayrollData();
      fetchPeriods();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadBulkPdf = async () => {
    if (!selectedPeriodId) return;
    setIsDownloadingBulkPdf(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/payroll/periods/${selectedPeriodId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Gagal mengunduh slip PDF' }));
        throw new Error(err.message || 'Gagal mengunduh rekap slip gaji seluruh karyawan');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const periodName = (activePeriod?.name || 'periode').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `rekap-semua-slip-gaji-${periodName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessBanner('File PDF rekap seluruh slip gaji berhasil diunduh');
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsDownloadingBulkPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {currentRole === 'EMPLOYEE' ? 'Slip Gaji Saya' : 'Manajemen Penggajian (Payroll)'}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              V2 Payroll
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {currentRole === 'EMPLOYEE'
              ? 'Akses dan cetak slip gaji bulanan Anda dengan rincian kehadiran dan upah lembur resmi.'
              : 'Master kompensasi, periode bulanan, perhitungan otomatis terintegrasi absensi & lembur, dan slip gaji.'}
          </p>
        </div>

        {/* Action Controls for Admin/HR */}
        {currentRole !== 'EMPLOYEE' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreatePeriodOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Periode Baru</span>
            </Button>

            {activePeriod && activePeriod.status === 'DRAFT' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePayroll}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                  title="Generate kalkulasi gaji dari data absensi & lembur"
                >
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span>Kalkulasi Otomatis</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleProcessPayroll}
                  disabled={actionLoading || records.length === 0}
                  className="flex items-center gap-1.5"
                >
                  <Lock className="h-4 w-4" />
                  <span>Kunci & Proses</span>
                </Button>
              </>
            )}

            {activePeriod && activePeriod.status === 'PROCESSED' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePayPayroll}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <DollarSign className="h-4 w-4" />
                <span>Bayar Gaji (PAID)</span>
              </Button>
            )}

            {records.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadBulkPdf}
                disabled={isDownloadingBulkPdf}
                className="flex items-center gap-1.5 text-slate-700 border-slate-300 hover:text-blue-700 hover:border-blue-400"
                title="Download seluruh slip gaji karyawan dalam satu dokumen PDF multi-halaman"
              >
                <Download className={`h-4 w-4 ${isDownloadingBulkPdf ? 'animate-bounce text-blue-600' : 'text-slate-600'}`} />
                <span>{isDownloadingBulkPdf ? 'Mengunduh PDF...' : 'Download Semua Slip (PDF)'}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Banners */}
      {successBanner && (
        <div className="flex items-center justify-between p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 font-bold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-center justify-between p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-700 font-bold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Period Selector & Tabs for HR/Admin */}
      {currentRole !== 'EMPLOYEE' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Pilih Periode:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white font-medium text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                fetchPeriods();
                fetchPayrollData();
              }}
              title="Refresh Data"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Slip Gaji Periode</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('master')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'master'
                  ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Master Gaji Karyawan</span>
            </button>
          </div>
        </div>
      )}

      {/* Overview Cards (Only in records tab or for HR/Admin) */}
      {currentRole !== 'EMPLOYEE' && activeTab === 'records' && (
        <PayrollSummaryCards
          summary={summary}
          activePeriod={activePeriod}
          isLoading={isLoadingData}
        />
      )}

      {/* Content Area */}
      {activeTab === 'records' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          {currentRole !== 'EMPLOYEE' && (
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau ID karyawan..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="text-xs text-slate-500">
                Menampilkan <strong>{records.length}</strong> rekor slip gaji
              </div>
            </div>
          )}

          {/* Records Table */}
          <PayrollTable
            records={records}
            isLoading={isLoadingData}
            currentRole={currentRole}
            onViewSlip={(rec) => setSelectedSlipRecord(rec)}
            onEditRecord={(rec) => setSelectedAdjustRecord(rec)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Konfigurasi Master Kompensasi Karyawan
            </h3>
            <span className="text-xs text-slate-500">
              Total {employees.length} karyawan terdaftar
            </span>
          </div>

          <SalaryMasterTable
            employees={employees}
            isLoading={isLoadingEmployees}
            onEditSalary={(emp) => setSelectedSalaryEmployee(emp)}
          />
        </div>
      )}

      {/* Modals */}
      <CreatePeriodModal
        isOpen={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
        onSuccess={() => {
          setSuccessBanner('Periode penggajian baru berhasil dibuat');
          fetchPeriods();
        }}
      />

      <PayrollSlipModal
        isOpen={!!selectedSlipRecord}
        onClose={() => setSelectedSlipRecord(null)}
        record={selectedSlipRecord}
      />

      <AdjustRecordModal
        isOpen={!!selectedAdjustRecord}
        onClose={() => setSelectedAdjustRecord(null)}
        record={selectedAdjustRecord}
        onSuccess={() => {
          setSuccessBanner('Slip gaji berhasil disesuaikan secara manual');
          fetchPayrollData();
        }}
      />

      <SalaryMasterModal
        isOpen={!!selectedSalaryEmployee}
        onClose={() => setSelectedSalaryEmployee(null)}
        employee={selectedSalaryEmployee}
        onSuccess={() => {
          setSuccessBanner('Master gaji karyawan berhasil diperbarui');
          fetchEmployeesMaster();
          fetchPayrollData();
        }}
      />
    </div>
  );
}
