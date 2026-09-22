'use client';

import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Eye, Edit2, FileText, CheckCircle2, Clock, AlertTriangle, Download } from 'lucide-react';
import { PayrollRecord, UserRole } from '@/types';

interface PayrollTableProps {
  records: PayrollRecord[];
  isLoading: boolean;
  currentRole: UserRole;
  onViewSlip: (record: PayrollRecord) => void;
  onEditRecord?: (record: PayrollRecord) => void;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  records,
  isLoading,
  currentRole,
  onViewSlip,
  onEditRecord,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const formatRupiah = (val?: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  const handleDownloadSinglePdf = async (rec: PayrollRecord) => {
    if (!rec.id) return;
    setDownloadingId(rec.id);
    try {
      const res = await fetch(`/api/payroll/records/${rec.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Gagal mengunduh slip PDF' }));
        throw new Error(err.message || 'Gagal mengunduh slip gaji PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const empId = rec.employee?.employeeId || 'EMP';
      const periodName = (rec.payrollPeriod?.name || 'periode').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `slip-gaji-${empId}-${periodName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh slip gaji PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const statusColorMap: Record<string, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSED: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm">Memuat data payroll...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
          <FileText className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">Belum Ada Rekor Slip Gaji</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          {currentRole === 'EMPLOYEE'
            ? 'Belum ada slip gaji yang diproses atau dibayarkan untuk Anda pada periode ini.'
            : 'Belum ada data slip gaji pada periode ini. Klik tombol "Kalkulasi Otomatis" untuk menghasilkan slip gaji.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Karyawan</th>
              <th className="px-4 py-3">Kehadiran & Lembur</th>
              <th className="px-4 py-3">Gaji Pokok + Tunjangan</th>
              <th className="px-4 py-3">Lembur & Potongan</th>
              <th className="px-4 py-3">Take-Home Pay</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {records.map((rec) => {
              const fullName = `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim() || 'Karyawan';
              const basic = Number(rec.basicSalary) || 0;
              const allowances = Number(rec.allowances) || 0;
              const overtimePay = Number(rec.overtimePay) || 0;
              const deductions = Number(rec.deductions) || 0;
              const netSalary = Number(rec.netSalary) || 0;

              return (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Karyawan */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-900">{fullName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{rec.employee?.employeeId || '-'}</span>
                          <span>•</span>
                          <span>{rec.employee?.department?.name || 'Umum'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Kehadiran & Lembur */}
                  <td className="px-4 py-3.5 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-700">
                        Hadir: <strong className="text-slate-900">{rec.presentDays}</strong> hr | Telat: <strong className="text-amber-600">{rec.lateDays}</strong>
                      </span>
                      <span className="text-slate-500">
                        Lembur: <strong className="text-emerald-600">{Number(rec.overtimeHours).toFixed(1)} jam</strong>
                      </span>
                    </div>
                  </td>

                  {/* Gaji Pokok & Tunjangan */}
                  <td className="px-4 py-3.5 text-xs">
                    <div className="font-medium text-slate-900">{formatRupiah(basic)}</div>
                    {allowances > 0 && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        + Tunj: {formatRupiah(allowances)}
                      </div>
                    )}
                  </td>

                  {/* Lembur & Potongan */}
                  <td className="px-4 py-3.5 text-xs">
                    <div className="text-emerald-600 font-medium">
                      + Lembur: {formatRupiah(overtimePay)}
                    </div>
                    {deductions > 0 && (
                      <div className="text-[11px] text-rose-500 mt-0.5">
                        - Pot: {formatRupiah(deductions)}
                      </div>
                    )}
                  </td>

                  {/* Net Salary (Take-Home Pay) */}
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatRupiah(netSalary)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        statusColorMap[rec.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onViewSlip(rec)}
                        className="h-8 px-2.5 text-xs flex items-center gap-1.5"
                        title="Lihat Slip Gaji"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>Slip</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSinglePdf(rec)}
                        disabled={downloadingId === rec.id}
                        className="h-8 px-2.5 text-xs flex items-center gap-1.5 text-slate-700 hover:text-blue-700 hover:border-blue-300"
                        title="Download Slip PDF"
                      >
                        <Download className={`h-3.5 w-3.5 ${downloadingId === rec.id ? 'animate-bounce text-blue-600' : 'text-slate-600'}`} />
                        <span className="hidden sm:inline">PDF</span>
                      </Button>

                      {currentRole !== 'EMPLOYEE' && onEditRecord && rec.status !== 'PAID' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditRecord(rec)}
                          className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                          title="Penyesuaian Manual"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
