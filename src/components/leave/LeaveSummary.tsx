import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LeaveRequest } from '@/types';
import { Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';

interface LeaveSummaryProps {
  leaveRequests: LeaveRequest[];
}

export const LeaveSummary: React.FC<LeaveSummaryProps> = ({ leaveRequests }) => {
  const pendingCount = leaveRequests.filter(
    (r) => r.status === 'Pending' || (r.status as string) === 'PENDING'
  ).length;
  const approvedCount = leaveRequests.filter(
    (r) => r.status === 'Approved' || (r.status as string) === 'APPROVED'
  ).length;
  const rejectedCount = leaveRequests.filter(
    (r) => r.status === 'Rejected' || (r.status as string) === 'REJECTED'
  ).length;
  const totalDaysRequested = leaveRequests.reduce((acc, curr) => acc + (curr.duration || 1), 0);

  const stats = [
    {
      label: 'Menunggu Persetujuan',
      value: pendingCount,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      label: 'Cuti Disetujui',
      value: approvedCount,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      label: 'Cuti Ditolak',
      value: rejectedCount,
      icon: XCircle,
      color: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    {
      label: 'Total Hari Diajukan',
      value: `${totalDaysRequested} hari`,
      icon: Calendar,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <h4 className="text-xl font-bold text-slate-900 mt-1">{s.value}</h4>
              </div>
              <div className={`p-2.5 rounded-lg border ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

