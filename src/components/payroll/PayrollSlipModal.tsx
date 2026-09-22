'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, Download, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { PayrollRecord } from '@/types';

interface PayrollSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!record) return null;

  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  const formatRupiah = (val?: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!record?.id) return;
    setIsDownloadingPdf(true);
    try {
      const res = await fetch(`/api/payroll/records/${record.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Gagal mengunduh slip PDF' }));
        throw new Error(err.message || 'Gagal mengunduh slip gaji PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const empId = record.employee?.employeeId || 'EMP';
      const periodName = (record.payrollPeriod?.name || 'periode').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `slip-gaji-${empId}-${periodName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh slip gaji PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const basicSalary = Number(record.basicSalary) || 0;
  const fixedAllowance = Number(record.fixedAllowance) || 0;
  const transportAllowance = Number(record.transportAllowance) || 0;
  const mealAllowance = Number(record.mealAllowance) || 0;
  const totalAllowances = Number(record.allowances) || (fixedAllowance + transportAllowance + mealAllowance);
  const overtimePay = Number(record.overtimePay) || 0;
  const grossSalary = Number(record.grossSalary) || (basicSalary + totalAllowances + overtimePay);

  const lateDeduction = Number(record.lateDeduction) || 0;
  const alphaDeduction = Number(record.alphaDeduction) || 0;
  const unpaidLeaveDeduction = Number(record.unpaidLeaveDeduction) || 0;
  const fixedDeduction = Number(record.fixedDeduction) || 0;
  const bpjsDeduction = Number(record.bpjsDeduction) || 0;
  const taxDeduction = Number(record.taxDeduction) || 0;
  const totalDeductions = Number(record.totalDeductions) || Number(record.deductions) || 0;

  const takeHomePay = Number(record.takeHomePay) || Number(record.netSalary) || 0;

  const statusBadge = {
    DRAFT: 'bg-amber-100 text-amber-800 border-amber-300',
    PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    PROCESSED: 'bg-blue-100 text-blue-800 border-blue-300',
    FINAL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  }[record.status] || 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Slip Gaji Karyawan"
      description="Rincian resmi kompensasi, kehadiran, dan upah lembur bulanan."
      maxWidth="lg"
    >
      <div className="space-y-6 print:m-0 print:p-0">
        {/* Printable Area Wrapper */}
        <div id="payroll-slip-printable" className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  ENTERPRISE HR SYSTEM
                </h2>
                <p className="text-xs text-slate-500">Bukti Pembayaran Gaji Karyawan (Payslip)</p>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${statusBadge}`}>
                {record.status === 'PAID' || record.status === 'FINAL' ? 'LUNAS / FINAL' : record.status}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                {record.payrollPeriod?.name || 'Periode Penggajian'}
              </p>
            </div>
          </div>

          {/* Employee & Bank Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Nama Karyawan</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {record.employee?.firstName} {record.employee?.lastName || ''}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">ID Karyawan</p>
              <p className="font-semibold text-slate-900 mt-0.5">{record.employee?.employeeId || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Departemen / Posisi</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {record.employee?.department?.name || 'Umum'} / {record.employee?.position || 'Staff'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Rekening Transfer</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {record.employee?.salary?.bankName || 'BCA'}: {record.employee?.salary?.bankAccountNumber || record.employee?.salary?.bankAccount || '-'}
              </p>
            </div>
          </div>

          {/* Attendance Summary Bar */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-2">
              Rekap Kehadiran & Lembur
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="block text-slate-400 text-[10px]">Hadir</span>
                <span className="font-bold text-slate-800 text-sm">{record.presentDays} hari</span>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="block text-slate-400 text-[10px]">Terlambat</span>
                <span className="font-bold text-amber-600 text-sm">{record.lateDays} hari</span>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="block text-slate-400 text-[10px]">Izin / Cuti</span>
                <span className="font-bold text-indigo-600 text-sm">{record.leaveDays} hari</span>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="block text-slate-400 text-[10px]">Alpa</span>
                <span className="font-bold text-rose-600 text-sm">{record.absentDays} hari</span>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="block text-slate-400 text-[10px]">Lembur ACC</span>
                <span className="font-bold text-emerald-600 text-sm">{Number(record.overtimeHours).toFixed(1)} jam</span>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* 1. Penerimaan (Earnings) */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wide">Penerimaan (Earnings)</span>
                <span className="text-[10px] text-slate-400">Nominal</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Gaji Pokok</span>
                <span className="font-semibold text-slate-900">{formatRupiah(basicSalary)}</span>
              </div>
              {fixedAllowance > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Tunjangan Tetap</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(fixedAllowance)}</span>
                </div>
              )}
              {transportAllowance > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Tunjangan Transport</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(transportAllowance)}</span>
                </div>
              )}
              {mealAllowance > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Tunjangan Makan</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(mealAllowance)}</span>
                </div>
              )}
              {fixedAllowance === 0 && transportAllowance === 0 && mealAllowance === 0 && totalAllowances > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Tunjangan</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(totalAllowances)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Upah Lembur ({Number(record.overtimeHours).toFixed(1)} jam)</span>
                <span className="font-semibold text-emerald-600">+ {formatRupiah(overtimePay)}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-100 font-bold text-slate-900">
                <span>Gross Salary (Kotor)</span>
                <span className="text-emerald-700">{formatRupiah(grossSalary)}</span>
              </div>
            </div>

            {/* 2. Potongan (Deductions) */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wide">Potongan (Deductions)</span>
                <span className="text-[10px] text-slate-400">Nominal</span>
              </div>
              {lateDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Potongan Terlambat ({record.lateDays}x)</span>
                  <span className="font-semibold text-rose-600">- {formatRupiah(lateDeduction)}</span>
                </div>
              )}
              {alphaDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Potongan Alpa ({record.absentDays} hari)</span>
                  <span className="font-semibold text-rose-600">- {formatRupiah(alphaDeduction)}</span>
                </div>
              )}
              {unpaidLeaveDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Cuti Tanpa Gaji ({record.unpaidLeaveDays || 0} hari)</span>
                  <span className="font-semibold text-rose-600">- {formatRupiah(unpaidLeaveDeduction)}</span>
                </div>
              )}
              {fixedDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Potongan Tetap</span>
                  <span className="font-semibold text-rose-600">- {formatRupiah(fixedDeduction)}</span>
                </div>
              )}
              {bpjsDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">BPJS Ketenagakerjaan/Kes</span>
                  <span className="font-semibold text-rose-600">- {formatRupiah(bpjsDeduction)}</span>
                </div>
              )}
              {taxDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Pajak PPh 21</span>
                  <span className="font-semibold text-rose-600">- {formatRupiah(taxDeduction)}</span>
                </div>
              )}
              {totalDeductions === 0 && (
                <div className="flex justify-between py-0.5 text-slate-400">
                  <span>Tidak ada potongan</span>
                  <span>Rp 0</span>
                </div>
              )}
              <div className="flex justify-between pt-2.5 border-t border-slate-100 font-bold text-slate-900">
                <span>Total Potongan</span>
                <span className="text-rose-700">- {formatRupiah(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Grand Take-Home Pay Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                GAJI BERSIH DITERIMA (TAKE-HOME PAY)
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                (Gross Salary - Total Potongan)
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatRupiah(takeHomePay)}
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-[11px] text-slate-400 italic text-center pt-2 border-t border-slate-100">
            Slip gaji ini diterbitkan secara otomatis oleh Enterprise HR & Attendance Management System dan berlaku sebagai bukti sah penerimaan gaji.
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2 text-slate-700"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className={`h-4 w-4 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPdf ? 'Mengunduh...' : 'Download Slip PDF'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
