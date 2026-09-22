'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ReimbursementSummaryCards } from '@/components/reimbursement/ReimbursementSummaryCards';
import { ReimbursementTable } from '@/components/reimbursement/ReimbursementTable';
import { CreateReimbursementModal } from '@/components/reimbursement/CreateReimbursementModal';
import { ReimbursementDetailModal } from '@/components/reimbursement/ReimbursementDetailModal';
import { ApproveReimbursementModal } from '@/components/reimbursement/ApproveReimbursementModal';
import { RejectReimbursementModal } from '@/components/reimbursement/RejectReimbursementModal';
import { PayReimbursementModal } from '@/components/reimbursement/PayReimbursementModal';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { ReimbursementRequest, ReimbursementSummary, UserRole } from '@/types';

export default function ReimbursementPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data & loading state
  const [records, setRecords] = useState<ReimbursementRequest[]>([]);
  const [summary, setSummary] = useState<ReimbursementSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<ReimbursementRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<ReimbursementRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReimbursementRequest | null>(null);
  const [payTarget, setPayTarget] = useState<ReimbursementRequest | null>(null);

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

  // 2. Fetch summary statistics
  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await fetch('/api/reimbursements/summary');
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data || null);
      }
    } catch (err) {
      console.error('Error fetching reimbursement summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // 3. Fetch reimbursement list
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter);
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

      const res = await fetch(`/api/reimbursements?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat data reimbursement.');
      }

      const json = await res.json();
      setRecords(json.data || []);
    } catch (err: any) {
      console.error('Error fetching reimbursements:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan saat memuat data reimbursement.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, startDateFilter, endDateFilter]);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchRecords();
  }, [fetchSummary, fetchRecords]);

  // Handle employee cancel
  const handleCancelRequest = async (req: ReimbursementRequest) => {
    const num = req.reimbursementNo || req.reimbursementNumber || '';
    if (!confirm(`Batalkan pengajuan reimbursement ${num}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/reimbursements/${req.id}/cancel`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membatalkan pengajuan.');
      }

      setSuccessBanner(`Pengajuan ${num} berhasil dibatalkan.`);
      if (detailTarget?.id === req.id) setDetailTarget(null);
      fetchSummary();
      fetchRecords();
    } catch (err: any) {
      console.error('Error cancelling reimbursement:', err);
      setErrorBanner(err.message || 'Gagal membatalkan pengajuan.');
    }
  };

  if (currentRole === 'EMPLOYEE') {
    return (
      <AccessDenied
        title="Akses Klaim Reimbursement Dibatasi"
        message="Halaman pengelolaan dan persetujuan klaim biaya reimbursement hanya dapat diakses oleh Administrator dan HR."
        requiredRole="ADMIN / HR"
        suggestedPath="/attendance"
        suggestedLabel="Buka Presensi Saya"
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Reimbursement & Biaya Operasional
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pusat persetujuan, verifikasi bukti nota, dan pencairan dana reimbursement karyawan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSummary();
              fetchRecords();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Ajukan Reimbursement</span>
          </Button>
        </div>
      </div>

      {/* Banners */}
      {successBanner && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-red-600 hover:text-red-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <ReimbursementSummaryCards summary={summary} isLoading={isSummaryLoading} />

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari no. pengajuan, karyawan, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs"
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'SUBMITTED', label: 'Menunggu Review' },
                { value: 'APPROVED', label: 'Disetujui HR' },
                { value: 'PAID', label: 'Sudah Dibayar' },
                { value: 'REJECTED', label: 'Ditolak' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'CANCELLED', label: 'Dibatalkan' },
              ]}
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs"
              options={[
                { value: 'all', label: 'Semua Kategori' },
                { value: 'TRANSPORTATION', label: 'Transportasi' },
                { value: 'MEALS', label: 'Konsumsi/Makan' },
                { value: 'BUSINESS_TRIP', label: 'Perjalanan Dinas' },
                { value: 'OPERATIONAL', label: 'Operasional Kantor' },
                { value: 'MEDICAL', label: 'Kesehatan' },
                { value: 'OTHER', label: 'Lain-lain' },
              ]}
            />
          </div>

          {/* Date range trigger / clear */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="text-xs"
              title="Dari Tanggal"
            />
            <span className="text-slate-400 text-xs">-</span>
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="text-xs"
              title="Sampai Tanggal"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <ReimbursementTable
        records={records}
        isLoading={isLoading}
        currentRole={currentRole}
        onViewDetail={(r) => setDetailTarget(r)}
        onApprove={(r) => setApproveTarget(r)}
        onReject={(r) => setRejectTarget(r)}
        onPay={(r) => setPayTarget(r)}
        onCancel={(r) => handleCancelRequest(r)}
      />

      {/* Modals */}
      <CreateReimbursementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setSuccessBanner('Pengajuan reimbursement berhasil dikirim.');
          fetchSummary();
          fetchRecords();
        }}
      />

      <ReimbursementDetailModal
        isOpen={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        reimbursement={detailTarget}
        currentRole={currentRole}
        onApprove={(r) => {
          setDetailTarget(null);
          setApproveTarget(r);
        }}
        onReject={(r) => {
          setDetailTarget(null);
          setRejectTarget(r);
        }}
        onPay={(r) => {
          setDetailTarget(null);
          setPayTarget(r);
        }}
        onCancel={(r) => {
          handleCancelRequest(r);
        }}
      />

      <ApproveReimbursementModal
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        reimbursement={approveTarget}
        onSuccess={() => {
          setSuccessBanner(
            `Pengajuan ${approveTarget?.reimbursementNo || approveTarget?.reimbursementNumber} berhasil disetujui.`,
          );
          fetchSummary();
          fetchRecords();
        }}
      />

      <RejectReimbursementModal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        reimbursement={rejectTarget}
        onSuccess={() => {
          setSuccessBanner(
            `Pengajuan ${rejectTarget?.reimbursementNo || rejectTarget?.reimbursementNumber} telah ditolak.`,
          );
          fetchSummary();
          fetchRecords();
        }}
      />

      <PayReimbursementModal
        isOpen={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        reimbursement={payTarget}
        onSuccess={() => {
          setSuccessBanner(
            `Pembayaran reimbursement ${payTarget?.reimbursementNo || payTarget?.reimbursementNumber} berhasil dikonfirmasi.`,
          );
          fetchSummary();
          fetchRecords();
        }}
      />
    </div>
  );
}
