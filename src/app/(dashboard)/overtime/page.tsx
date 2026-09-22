'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Timer,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { OvertimeSummaryCards } from '@/components/overtime/OvertimeSummaryCards';
import { OvertimeTable } from '@/components/overtime/OvertimeTable';
import { CreateOvertimeModal } from '@/components/overtime/CreateOvertimeModal';
import { EditOvertimeModal } from '@/components/overtime/EditOvertimeModal';
import { OvertimeDetailModal } from '@/components/overtime/OvertimeDetailModal';
import { ApproveOvertimeModal } from '@/components/overtime/ApproveOvertimeModal';
import { RejectOvertimeModal } from '@/components/overtime/RejectOvertimeModal';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { OvertimeRecord, OvertimeStatus, UserRole } from '@/types';

export default function OvertimePage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Overtime records & loading state
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OvertimeRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<OvertimeRecord | null>(null);
  const [approveTarget, setApproveTarget] = useState<OvertimeRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OvertimeRecord | null>(null);

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

  // 2. Fetch overtime records with filters
  const fetchOvertimeRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (startDateFilter) {
        params.append('startDate', startDateFilter);
      }
      if (endDateFilter) {
        params.append('endDate', endDateFilter);
      }
      params.append('limit', '100');

      const res = await fetch(`/api/overtime?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat data lembur.');
      }

      const json = await res.json();
      setRecords(json.data || []);
    } catch (err: any) {
      console.error('Error fetching overtime:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan saat memuat data lembur.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchOvertimeRecords();
  }, [fetchOvertimeRecords]);

  // Handle Cancel pending request
  const handleCancelRequest = async (record: OvertimeRecord) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pengajuan lembur ini?')) {
      return;
    }

    try {
      const res = await fetch(`/api/overtime/${record.id}/cancel`, {
        method: 'PATCH',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal membatalkan pengajuan lembur.');
      }

      setSuccessBanner('Pengajuan lembur berhasil dibatalkan.');
      fetchOvertimeRecords();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const handleSuccessAction = (msg: string) => {
    setSuccessBanner(msg);
    fetchOvertimeRecords();
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  if (currentRole === 'EMPLOYEE') {
    return (
      <AccessDenied
        title="Akses Manajemen Lembur Dibatasi"
        message="Halaman pengelolaan dan persetujuan lembur karyawan hanya dapat diakses oleh Administrator dan HR."
        requiredRole="ADMIN / HR"
        suggestedPath="/attendance"
        suggestedLabel="Buka Riwayat Presensi Saya"
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Notifications */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs text-emerald-700 font-semibold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-sm shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-xs text-rose-700 font-semibold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Manajemen Lembur (Overtime)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola pengajuan rencana lembur, verifikasi realisasi absensi, dan persetujuan menit lembur.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOvertimeRecords}
            disabled={isLoading}
            className="text-xs h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Ajukan Lembur
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <OvertimeSummaryCards records={records} currentRole={currentRole} />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="PENDING">Menunggu Approval (Pending)</option>
              <option value="APPROVED">Disetujui (Approved)</option>
              <option value="REJECTED">Ditolak (Rejected)</option>
              <option value="CANCELLED">Dibatalkan (Cancelled)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              placeholder="Dari Tanggal"
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              placeholder="Sampai Tanggal"
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Reset Filters */}
        {(searchQuery || statusFilter !== 'all' || startDateFilter || endDateFilter) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="text-xs text-slate-500 hover:text-indigo-600 underline font-medium"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <OvertimeTable
        records={records}
        isLoading={isLoading}
        currentRole={currentRole}
        onViewDetail={(record) => setDetailTarget(record)}
        onEdit={(record) => setEditTarget(record)}
        onApprove={(record) => setApproveTarget(record)}
        onReject={(record) => setRejectTarget(record)}
        onCancel={(record) => handleCancelRequest(record)}
      />

      {/* Modals */}
      <CreateOvertimeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => handleSuccessAction('Pengajuan lembur berhasil dikirim ke HR/Admin.')}
      />

      <EditOvertimeModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        record={editTarget}
        onSuccess={() => handleSuccessAction('Pengajuan lembur berhasil diperbarui.')}
      />

      <OvertimeDetailModal
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        record={detailTarget}
      />

      <ApproveOvertimeModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        record={approveTarget}
        onSuccess={() => handleSuccessAction('Pengajuan lembur berhasil disetujui.')}
      />

      <RejectOvertimeModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        record={rejectTarget}
        onSuccess={() => handleSuccessAction('Pengajuan lembur berhasil ditolak.')}
      />
    </div>
  );
}
