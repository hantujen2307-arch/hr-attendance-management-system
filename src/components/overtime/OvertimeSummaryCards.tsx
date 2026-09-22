'use client';

import React from 'react';
import { Timer, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { OvertimeRecord, UserRole } from '@/types';

interface OvertimeSummaryCardsProps {
  records: OvertimeRecord[];
  currentRole: UserRole;
}

export const OvertimeSummaryCards: React.FC<OvertimeSummaryCardsProps> = ({
  records,
  currentRole,
}) => {
  const isEmployee = currentRole === 'EMPLOYEE';

  const pendingCount = records.filter((r) => r.status === 'PENDING').length;
  const approvedCount = records.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = records.filter((r) => r.status === 'REJECTED').length;
  const totalCount = records.length;

  const totalApprovedMinutes = records
    .filter((r) => r.status === 'APPROVED')
    .reduce((acc, curr) => acc + (curr.approvedMinutes || 0), 0);

  const formatHoursMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}j ${mins}m`;
    if (hrs > 0) return `${hrs} Jam`;
    return `${mins} Menit`;
  };

  const cards = isEmployee
    ? [
        {
          title: 'Total Pengajuan',
          value: totalCount,
          description: 'Pengajuan lembur Anda',
          icon: Clock,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-100',
        },
        {
          title: 'Menunggu Persetujuan',
          value: pendingCount,
          description: 'Sedang ditinjau HR/Admin',
          icon: AlertCircle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-100',
        },
        {
          title: 'Disetujui',
          value: approvedCount,
          description: 'Lembur yang telah di-approve',
          icon: CheckCircle2,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-100',
        },
        {
          title: 'Ditolak / Batal',
          value: rejectedCount,
          description: 'Pengajuan tidak disetujui',
          icon: XCircle,
          color: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-100',
        },
        {
          title: 'Total Lembur Disetujui',
          value: formatHoursMinutes(totalApprovedMinutes),
          description: `${totalApprovedMinutes} menit akumulasi`,
          icon: Timer,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
        },
      ]
    : [
        {
          title: 'Menunggu Approval',
          value: pendingCount,
          description: 'Perlu verifikasi & persetujuan',
          icon: AlertCircle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-100',
          highlight: pendingCount > 0,
        },
        {
          title: 'Lembur Disetujui',
          value: approvedCount,
          description: 'Telah disetujui HR/Admin',
          icon: CheckCircle2,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-100',
        },
        {
          title: 'Pengajuan Ditolak',
          value: rejectedCount,
          description: 'Tidak memenuhi kriteria lembur',
          icon: XCircle,
          color: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-100',
        },
        {
          title: 'Total Jam Lembur',
          value: formatHoursMinutes(totalApprovedMinutes),
          description: `Total ${totalApprovedMinutes} menit disetujui`,
          icon: Timer,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-100',
        },
        {
          title: 'Total Permintaan',
          value: totalCount,
          description: 'Seluruh riwayat lembur staf',
          icon: TrendingUp,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
        },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className={`p-4 border transition-all duration-200 hover:shadow-md ${card.borderColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 line-clamp-1">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {card.value}
              </span>
              {(card as any).highlight && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                  Baru
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
              {card.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
};
