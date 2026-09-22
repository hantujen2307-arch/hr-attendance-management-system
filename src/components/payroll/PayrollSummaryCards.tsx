'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Users, DollarSign, Wallet, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import { PayrollPeriod, PayrollSummary } from '@/types';

interface PayrollSummaryCardsProps {
  summary: PayrollSummary | null;
  activePeriod: PayrollPeriod | null;
  isLoading?: boolean;
}

export const PayrollSummaryCards: React.FC<PayrollSummaryCardsProps> = ({
  summary,
  activePeriod,
  isLoading = false,
}) => {
  const formatRupiah = (val?: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  const statusColorMap: Record<string, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSED: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Net Pay */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Take-Home Pay</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {isLoading ? '...' : formatRupiah(summary?.totalNetSalary)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary?.totalEmployees || 0} karyawan terdaftar
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 2. Basic Salary & Allowances */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Gaji Pokok & Tunjangan</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {isLoading
                ? '...'
                : formatRupiah((summary?.totalBasicSalary || 0) + (summary?.totalAllowances || 0))}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tunjangan: {formatRupiah(summary?.totalAllowances)}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 3. Overtime & Deductions */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Upah Lembur & Potongan</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">
              {isLoading ? '...' : `+ ${formatRupiah(summary?.totalOvertimePay)}`}
            </h3>
            <p className="text-[11px] text-rose-500 mt-0.5">
              Potongan: - {formatRupiah(summary?.totalDeductions)}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 4. Active Period Status */}
      <Card className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all bg-white shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Status Periode Aktif</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                  activePeriod?.status
                    ? statusColorMap[activePeriod.status] || 'bg-slate-50 text-slate-600'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                {activePeriod?.status || 'BELUM ADA PERIODE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[150px]">
              {activePeriod ? activePeriod.name : 'Pilih/buat periode'}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
};
