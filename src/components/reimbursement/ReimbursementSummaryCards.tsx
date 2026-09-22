'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Receipt, Clock, CheckCircle2, Wallet, XCircle } from 'lucide-react';
import { ReimbursementSummary } from '@/types';

interface ReimbursementSummaryCardsProps {
  summary: ReimbursementSummary | null;
  isLoading?: boolean;
}

export const ReimbursementSummaryCards: React.FC<ReimbursementSummaryCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  const formatRupiah = (val?: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Diajukan */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Pengajuan</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {isLoading ? '...' : formatRupiah(summary?.totalRequestedAmount ?? summary?.totalAmount)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary?.totalRequests || 0} klaim diajukan
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Receipt className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 2. Menunggu Review (SUBMITTED) */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600">Menunggu Review</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {isLoading ? '...' : formatRupiah(summary?.submittedAmount ?? 0)}
            </h3>
            <p className="text-[11px] text-amber-600/80 mt-0.5 font-medium">
              {summary?.submittedCount || 0} klaim perlu tindakan
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 3. Disetujui (APPROVED) */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600">Disetujui HR</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {isLoading ? '...' : formatRupiah(summary?.totalApprovedAmount ?? summary?.approvedAmount)}
            </h3>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">
              {summary?.approvedCount || 0} klaim siap dibayar
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 4. Dibayarkan (PAID) */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-600">Sudah Dibayarkan</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {isLoading ? '...' : formatRupiah(summary?.totalPaidAmount ?? summary?.paidAmount)}
            </h3>
            <p className="text-[11px] text-indigo-600/80 mt-0.5">
              {summary?.paidCount || 0} klaim terealisasi
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
};
