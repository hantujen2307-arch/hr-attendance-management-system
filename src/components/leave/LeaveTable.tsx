'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LeaveRequest } from '@/types';
import { formatDate } from '@/lib/utils';
import { Check, X, Trash2 } from 'lucide-react';

interface LeaveTableProps {
  requests: LeaveRequest[];
  currentRole?: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export const LeaveTable: React.FC<LeaveTableProps> = ({
  requests,
  currentRole = 'EMPLOYEE',
  onApprove,
  onReject,
  onCancel,
}) => {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Tidak ada data pengajuan cuti</p>
        <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kriteria filter pencarian</p>
      </div>
    );
  }

  const isStaff = currentRole === 'ADMIN' || currentRole === 'HR';
  const isEmployee = currentRole === 'EMPLOYEE';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Karyawan</TableHead>
          <TableHead>Jenis Izin / Cuti</TableHead>
          <TableHead>Mulai</TableHead>
          <TableHead>Selesai</TableHead>
          <TableHead>Durasi</TableHead>
          <TableHead>Alasan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => {
          const isPending =
            req.status === 'Pending' ||
            (req.status as string) === 'PENDING';
          const isApproved =
            req.status === 'Approved' ||
            (req.status as string) === 'APPROVED';
          const isRejected =
            req.status === 'Rejected' ||
            (req.status as string) === 'REJECTED';

          const statusDisplay = isApproved
            ? 'Disetujui'
            : isPending
            ? 'Menunggu'
            : 'Ditolak';

          const statusVariant = isApproved
            ? 'success'
            : isPending
            ? 'warning'
            : 'danger';

          return (
            <TableRow key={req.id}>
              {/* Employee */}
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={req.employeeName} src={req.employeeAvatar} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-900">{req.employeeName}</span>
                    <span className="text-xs text-slate-400 truncate">{req.department}</span>
                  </div>
                </div>
              </TableCell>

              {/* Leave Type */}
              <TableCell>
                <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded-md">
                  {req.leaveType}
                </span>
              </TableCell>

              {/* Start Date */}
              <TableCell>
                <span className="text-xs text-slate-700">{formatDate(req.startDate)}</span>
              </TableCell>

              {/* End Date */}
              <TableCell>
                <span className="text-xs text-slate-700">{formatDate(req.endDate)}</span>
              </TableCell>

              {/* Duration */}
              <TableCell>
                <span className="text-xs font-semibold text-slate-800">
                  {req.duration} {req.duration > 1 ? 'hari' : 'hari'}
                </span>
              </TableCell>

              {/* Reason */}
              <TableCell className="max-w-xs">
                <p className="text-xs text-slate-600 truncate" title={req.reason}>
                  {req.reason}
                </p>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge variant={statusVariant} dot>
                  {statusDisplay}
                </Badge>
              </TableCell>

              {/* Action */}
              <TableCell className="text-right">
                {isPending ? (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* ADMIN and HR see Approve & Reject */}
                    {isStaff && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                          title="Setujui Pengajuan"
                          onClick={() => onApprove && onApprove(req.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                          title="Tolak Pengajuan"
                          onClick={() => onReject && onReject(req.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    {/* EMPLOYEE only sees Batalkan */}
                    {isEmployee && onCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300 gap-1"
                        title="Batalkan Pengajuan"
                        onClick={() => onCancel(req.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Batalkan</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Selesai</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

