'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ReimbursementRequest, UserRole } from '@/types';
import {
  Eye,
  CheckCircle2,
  XCircle,
  Wallet,
  FileText,
  Image as ImageIcon,
  Receipt,
} from 'lucide-react';

interface ReimbursementTableProps {
  records: ReimbursementRequest[];
  isLoading: boolean;
  currentRole: UserRole;
  onViewDetail: (record: ReimbursementRequest) => void;
  onApprove?: (record: ReimbursementRequest) => void;
  onReject?: (record: ReimbursementRequest) => void;
  onPay?: (record: ReimbursementRequest) => void;
  onCancel?: (record: ReimbursementRequest) => void;
}

export const ReimbursementTable: React.FC<ReimbursementTableProps> = ({
  records,
  isLoading,
  currentRole,
  onViewDetail,
  onApprove,
  onReject,
  onPay,
  onCancel,
}) => {
  const formatRupiah = (val?: number | null) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

  const formatDate = (val?: string) => {
    if (!val) return '-';
    return new Date(val).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEmployeeName = (r: ReimbursementRequest) => {
    if (r.employee?.firstName || r.employee?.lastName) {
      return `${r.employee.firstName || ''} ${r.employee.lastName || ''}`.trim();
    }
    return r.employee?.name || '-';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="warning">Menunggu Review</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Ditolak</Badge>;
      case 'PAID':
        return <Badge variant="info">Dibayar</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Dibatalkan</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="neutral">DRAFT</Badge>;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'TRANSPORTATION':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'MEALS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BUSINESS_TRIP':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OPERATIONAL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      TRANSPORTATION: 'Transportasi',
      MEALS: 'Konsumsi',
      BUSINESS_TRIP: 'Perjalanan Dinas',
      OPERATIONAL: 'Operasional',
      MEDICAL: 'Kesehatan',
      OTHER: 'Lainnya',
    };
    return labels[category] || category;
  };

  const isAdminOrHr = currentRole === 'ADMIN' || currentRole === 'HR';

  return (
    <Card className="overflow-hidden border border-slate-200/80 shadow-xs bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">No. Pengajuan</th>
              <th className="py-3.5 px-4">Karyawan</th>
              <th className="py-3.5 px-4">Kategori</th>
              <th className="py-3.5 px-4">Tgl Kwitansi</th>
              <th className="py-3.5 px-4">Nominal</th>
              <th className="py-3.5 px-4 text-center">Bukti</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-32 mb-1" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-6 w-6 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-200 rounded w-16" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-8 bg-slate-200 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">
                    Tidak ada data pengajuan reimbursement
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gunakan tombol di atas untuk mengajukan klaim reimbursement baru.
                  </p>
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const receipt = r.receiptUrl || r.receiptProof || '';
                const reqNo = r.reimbursementNo || r.reimbursementNumber || '-';
                const dateVal = r.date || r.expenseDate;
                const empName = getEmployeeName(r);

                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Number */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {reqNo}
                    </td>

                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{empName}</p>
                      <p className="text-[11px] text-slate-400">
                        {r.employee?.employeeId} &bull; {r.employee?.department?.name || 'General'}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeClass(
                          r.category,
                        )}`}
                      >
                        {getCategoryLabel(r.category)}
                      </span>
                    </td>

                    {/* Expense Date */}
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(dateVal)}</td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{formatRupiah(r.amount)}</p>
                      {r.approvedAmount !== null && r.approvedAmount !== undefined && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Disetujui: {formatRupiah(r.approvedAmount)}
                        </p>
                      )}
                    </td>

                    {/* Receipt icon */}
                    <td className="py-3.5 px-4 text-center">
                      {receipt ? (
                        <button
                          type="button"
                          onClick={() => onViewDetail(r)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Lihat Bukti Kwitansi"
                        >
                          {receipt.startsWith('data:image/') ||
                          r.receiptFileName?.match(/\.(jpe?g|png|webp)$/i) ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewDetail(r)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                        title="Lihat Rincian"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      {/* Admin/HR actions on SUBMITTED */}
                      {isAdminOrHr && r.status === 'SUBMITTED' && (
                        <>
                          {onApprove && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onApprove(r)}
                              className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                              title="Setujui Pengajuan"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onReject && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onReject(r)}
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                              title="Tolak Pengajuan"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}

                      {/* Admin/HR action on APPROVED -> PAY */}
                      {isAdminOrHr && r.status === 'APPROVED' && onPay && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPay(r)}
                          className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50"
                          title="Bayar Reimbursement"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Employee cancel on SUBMITTED/DRAFT */}
                      {!isAdminOrHr &&
                        (r.status === 'SUBMITTED' || r.status === 'DRAFT') &&
                        onCancel && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onCancel(r)}
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                            title="Batalkan Pengajuan"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
