'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LeaveRequest, LeaveType, UserRole } from '@/types';
import { LeaveTable } from '@/components/leave/LeaveTable';
import { LeaveSummary } from '@/components/leave/LeaveSummary';
import { RequestLeaveModal } from '@/components/leave/RequestLeaveModal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import {
  CalendarOff,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function LeavePage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('EMPLOYEE');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch current authenticated user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user || data?.data || data;
        if (u?.role) {
          setCurrentRole(u.role as UserRole);
          setCurrentUser(u);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch live leave requests from backend
  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/leave');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat data pengajuan cuti.');
      }

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.data || [];

      const formatted: LeaveRequest[] = rawList.map((item: any) => {
        const empName = item.employee
          ? `${item.employee.firstName || ''} ${item.employee.lastName || ''}`.trim()
          : item.employeeName || 'Karyawan';

        const deptName =
          typeof item.employee?.department === 'object'
            ? item.employee?.department?.name || 'Umum'
            : item.employee?.department || item.department || 'Umum';

        const typeName =
          typeof item.leaveType === 'object'
            ? item.leaveType?.name
            : item.leaveType || 'Annual Leave';

        return {
          id: item.id,
          employeeId: item.employee?.employeeId || item.employeeId || 'EMP-001',
          employeeName: empName,
          employeeAvatar: item.employee?.photo || item.employeeAvatar || '',
          department: deptName,
          leaveType: typeName as LeaveType,
          startDate: item.startDate ? item.startDate.split('T')[0] : '',
          endDate: item.endDate ? item.endDate.split('T')[0] : '',
          duration: item.duration || 1,
          reason: item.reason || '',
          status: item.status,
          appliedAt: item.createdAt ? item.createdAt.split('T')[0] : '',
        };
      });

      setRequests(formatted);
    } catch (err: any) {
      console.error('Error fetching leave requests:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan saat memuat data cuti.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  // Approve action (ADMIN and HR only)
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/leave/${id}/approve`, {
        method: 'PATCH',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyetujui pengajuan cuti.');
      }

      setSuccessBanner('Pengajuan cuti berhasil disetujui.');
      fetchLeaveRequests();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Reject action (ADMIN and HR only)
  const handleReject = async (id: string) => {
    const reason = window.prompt('Masukkan alasan penolakan (opsional):');
    if (reason === null) return; // User clicked Cancel

    try {
      const res = await fetch(`/api/leave/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menolak pengajuan cuti.');
      }

      setSuccessBanner('Pengajuan cuti berhasil ditolak.');
      fetchLeaveRequests();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Cancel action (EMPLOYEE owner or Admin/HR)
  const handleCancel = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pengajuan cuti ini?')) {
      return;
    }

    try {
      const res = await fetch(`/api/leave/${id}/cancel`, {
        method: 'PATCH',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal membatalkan pengajuan cuti.');
      }

      setSuccessBanner('Pengajuan cuti berhasil dibatalkan.');
      fetchLeaveRequests();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Add new leave request
  const handleAddRequest = async (payload: any) => {
    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: payload.employeeId,
        leaveTypeId: payload.leaveTypeId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        duration: payload.duration,
        reason: payload.reason,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal mengirim pengajuan cuti.');
    }

    setSuccessBanner('Pengajuan cuti berhasil dikirim ke HR/Admin.');
    fetchLeaveRequests();
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus =
        statusFilter === 'all' ||
        req.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === 'all' ||
        req.leaveType.toLowerCase() === typeFilter.toLowerCase();

      const matchesSearch =
        req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [requests, statusFilter, typeFilter, searchQuery]);

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarOff className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Manajemen Pengajuan Cuti & Izin
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentRole === 'EMPLOYEE'
                  ? 'Ajukan permohonan izin/cuti dan pantau status persetujuan dari HR/Admin.'
                  : 'Tinjau, setujui, atau tolak pengajuan cuti dan izin seluruh karyawan.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaveRequests}
            disabled={isLoading}
            className="text-xs h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="text-xs h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Ajukan Cuti
          </Button>
        </div>
      </div>

      {/* Leave KPI Cards */}
      <LeaveSummary leaveRequests={requests} />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Cari nama karyawan atau alasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'PENDING', label: 'Menunggu Persetujuan' },
              { value: 'APPROVED', label: 'Disetujui' },
              { value: 'REJECTED', label: 'Ditolak' },
            ]}
          />

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Semua Jenis Cuti' },
              { value: 'Annual Leave', label: 'Annual Leave / Cuti Tahunan' },
              { value: 'Sick Leave', label: 'Sick Leave / Izin Sakit' },
              { value: 'Casual Leave', label: 'Casual Leave / Izin Pribadi' },
              { value: 'Unpaid Leave', label: 'Unpaid Leave / Tanpa Gaji' },
            ]}
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-500 px-1">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredRequests.length}</strong> pengajuan cuti
          </span>
        </div>
        <LeaveTable
          requests={filteredRequests}
          currentRole={currentRole}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
        />
      </div>

      {/* Request Leave Modal */}
      <RequestLeaveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitLeave={handleAddRequest}
        userRole={currentRole}
      />
    </div>
  );
}

