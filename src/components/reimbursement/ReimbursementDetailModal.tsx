'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReimbursementRequest, UserRole } from '@/types';
import { getPhotoUrl } from '@/lib/utils';
import {
  Calendar,
  DollarSign,
  FileText,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Download,
  Eye,
} from 'lucide-react';

interface ReimbursementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reimbursement: ReimbursementRequest | null;
  currentRole: UserRole;
  onApprove?: (req: ReimbursementRequest) => void;
  onReject?: (req: ReimbursementRequest) => void;
  onPay?: (req: ReimbursementRequest) => void;
  onCancel?: (req: ReimbursementRequest) => void;
}

export const ReimbursementDetailModal: React.FC<ReimbursementDetailModalProps> = ({
  isOpen,
  onClose,
  reimbursement,
  currentRole,
  onApprove,
  onReject,
  onPay,
  onCancel,
}) => {
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  if (!reimbursement) return null;

  const formatRupiah = (val?: number | null) => `Rp ${(val || 0).toLocaleString('id-ID')}`;
  const formatDate = (val?: string | null) => {
    if (!val) return '-';
    return new Date(val).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const reqNo = reimbursement.reimbursementNo || reimbursement.reimbursementNumber || '-';
  const expenseDateVal = reimbursement.date || reimbursement.expenseDate;
  const receiptData = reimbursement.receiptUrl || reimbursement.receiptProof || '';
  const employeeName =
    reimbursement.employee?.firstName || reimbursement.employee?.lastName
      ? `${reimbursement.employee.firstName || ''} ${reimbursement.employee.lastName || ''}`.trim()
      : reimbursement.employee?.name || '-';

  const approverName =
    reimbursement.approver?.email || reimbursement.approvedByUser?.name || 'HR/Admin';
  const payerName = reimbursement.payer?.email || reimbursement.paidByUser?.name || 'Finance/Admin';
  const notesText = reimbursement.notes || reimbursement.approvalNotes;
  const rejectReason = reimbursement.rejectedReason || reimbursement.rejectionReason;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="warning">Menunggu Review</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Disetujui HR</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Ditolak</Badge>;
      case 'PAID':
        return <Badge variant="info">Sudah Dibayar</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Dibatalkan</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="neutral">DRAFT</Badge>;
    }
  };

  const isImageReceipt =
    receiptData.startsWith('data:image/') ||
    reimbursement.receiptFileName?.match(/\.(jpe?g|png|webp)$/i);

  const isPdfReceipt =
    receiptData.startsWith('data:application/pdf') ||
    reimbursement.receiptFileName?.toLowerCase().endsWith('.pdf');

  const isAdminOrHr = currentRole === 'ADMIN' || currentRole === 'HR';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detail Pengajuan — ${reqNo}`}
      description="Rincian lengkap pengeluaran, bukti pembayaran, dan riwayat persetujuan."
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Status Klaim
            </span>
            <div className="mt-1 flex items-center gap-2">
              {getStatusBadge(reimbursement.status)}
              <span className="text-xs text-slate-500 font-medium">
                {reimbursement.category.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Nominal Klaim
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatRupiah(reimbursement.amount)}
            </div>
            {reimbursement.approvedAmount !== null &&
              reimbursement.approvedAmount !== undefined && (
                <div className="text-xs font-semibold text-emerald-600">
                  Disetujui: {formatRupiah(reimbursement.approvedAmount)}
                </div>
              )}
          </div>
        </div>

        {/* Employee & Transaction Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Employee Box */}
          <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>Data Karyawan</span>
            </div>
            <div className="space-y-1 pl-5 text-slate-600">
              <p>
                <strong className="text-slate-800">{employeeName}</strong>
              </p>
              <p>NIP: {reimbursement.employee?.employeeId || '-'}</p>
              <p>
                Departemen: {reimbursement.employee?.department?.name || 'General'}
              </p>
              <p>
                Jabatan:{' '}
                {typeof reimbursement.employee?.position === 'object'
                  ? reimbursement.employee?.position?.name
                  : reimbursement.employee?.position || 'Staff'}
              </p>
            </div>
          </div>

          {/* Expense Box */}
          <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Informasi Kwitansi</span>
            </div>
            <div className="space-y-1 pl-5 text-slate-600">
              <p>
                Tanggal Nota/Kwitansi:{' '}
                <strong className="text-slate-800">{formatDate(expenseDateVal)}</strong>
              </p>
              <p>Tanggal Pengajuan: {formatDate(reimbursement.createdAt)}</p>
              <p>
                Kategori: <span className="font-semibold text-blue-600">{reimbursement.category}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-3.5 rounded-lg border border-slate-200 text-xs">
          <p className="font-semibold text-slate-700 mb-1">Deskripsi & Keperluan:</p>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
            {reimbursement.description}
          </p>
        </div>

        {/* Receipt Section */}
        <div className="p-3.5 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Bukti Pembayaran / Struk</span>
            </p>
            {receiptData && (
              <a
                href={receiptData}
                download={reimbursement.receiptFileName || 'bukti-reimbursement'}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh / Buka Asli
              </a>
            )}
          </div>

          {receiptData ? (
            <div>
              {isImageReceipt ? (
                <div className="space-y-2">
                  <div
                    className="relative group cursor-pointer border border-slate-200 rounded-lg overflow-hidden bg-slate-900/5 max-h-80 flex items-center justify-center"
                    onClick={() => setShowFullReceipt(!showFullReceipt)}
                  >
                    <img
                      src={getPhotoUrl(receiptData)}
                      alt={reimbursement.receiptFileName || 'Bukti kwitansi'}
                      className="max-h-72 object-contain w-auto hover:opacity-95 transition-opacity"
                    />
                    <div className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3 h-3" />
                      Klik untuk perbesar
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    File: {reimbursement.receiptFileName || 'receipt.jpg'} &bull;{' '}
                    {reimbursement.receiptFileSize
                      ? `${(reimbursement.receiptFileSize / 1024).toFixed(1)} KB`
                      : ''}
                  </p>
                </div>
              ) : isPdfReceipt ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <FileText className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">{reimbursement.receiptFileName || 'Kwitansi.pdf'}</p>
                      <p className="text-[10px] text-red-500">Dokumen PDF Terverifikasi</p>
                    </div>
                  </div>
                  <a
                    href={receiptData}
                    download={reimbursement.receiptFileName || 'dokumen.pdf'}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Dokumen PDF
                  </a>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border rounded text-slate-500">
                  File bukti: {reimbursement.receiptFileName || 'Tersimpan'}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 italic">Tidak ada lampiran bukti pembayaran.</p>
          )}
        </div>

        {/* Approval / Rejection / Payment History Details */}
        {reimbursement.status === 'APPROVED' && (
          <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs space-y-1 text-emerald-900">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Disetujui oleh {approverName}</span>
            </div>
            <p className="pl-5 text-emerald-700">
              Tanggal: {formatDate(reimbursement.approvedAt)} &bull; Nominal Disetujui:{' '}
              <strong>{formatRupiah(reimbursement.approvedAmount)}</strong>
            </p>
            {notesText && <p className="pl-5 text-emerald-800 italic">&ldquo;{notesText}&rdquo;</p>}
          </div>
        )}

        {reimbursement.status === 'REJECTED' && (
          <div className="p-3.5 rounded-lg bg-red-50/80 border border-red-200 text-xs space-y-1 text-red-900">
            <div className="flex items-center gap-1.5 font-semibold text-red-800">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Ditolak oleh {approverName}</span>
            </div>
            <p className="pl-5 text-red-700">
              Tanggal: {formatDate(reimbursement.approvedAt || reimbursement.updatedAt)}
            </p>
            <p className="pl-5 text-red-800 font-medium">
              Alasan: &ldquo;{rejectReason}&rdquo;
            </p>
          </div>
        )}

        {reimbursement.status === 'PAID' && (
          <div className="p-3.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs space-y-1 text-indigo-900">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-800">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>Dibayarkan oleh {payerName}</span>
            </div>
            <p className="pl-5 text-indigo-700">
              Tanggal Pembayaran: {formatDate(reimbursement.paidAt)} &bull; Nominal:{' '}
              <strong>{formatRupiah(reimbursement.approvedAmount ?? reimbursement.amount)}</strong>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div>
            {/* Cancel button for Employee if DRAFT or SUBMITTED */}
            {(reimbursement.status === 'SUBMITTED' || reimbursement.status === 'DRAFT') &&
              onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onCancel(reimbursement)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  Batalkan Pengajuan
                </Button>
              )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>

            {/* Admin / HR actions */}
            {isAdminOrHr && reimbursement.status === 'SUBMITTED' && (
              <>
                {onReject && (
                  <Button
                    type="button"
                    onClick={() => onReject(reimbursement)}
                    className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak
                  </Button>
                )}
                {onApprove && (
                  <Button
                    type="button"
                    onClick={() => onApprove(reimbursement)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Setujui
                  </Button>
                )}
              </>
            )}

            {isAdminOrHr && reimbursement.status === 'APPROVED' && onPay && (
              <Button
                type="button"
                onClick={() => onPay(reimbursement)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                Bayar Reimbursement
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
