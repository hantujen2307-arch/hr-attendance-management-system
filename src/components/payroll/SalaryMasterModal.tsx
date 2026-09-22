'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { EmployeeSalary } from '@/types';

interface SalaryMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName?: string;
    department?: { name: string } | null;
    salary?: EmployeeSalary | null;
  } | null;
}

export const SalaryMasterModal: React.FC<SalaryMasterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
}) => {
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [fixedAllowance, setFixedAllowance] = useState<number>(0);
  const [transportAllowance, setTransportAllowance] = useState<number>(0);
  const [mealAllowance, setMealAllowance] = useState<number>(0);

  const [fixedDeduction, setFixedDeduction] = useState<number>(0);
  const [bpjsDeduction, setBpjsDeduction] = useState<number>(0);
  const [taxDeduction, setTaxDeduction] = useState<number>(0);

  const [overtimeRatePerHour, setOvertimeRatePerHour] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankAccountHolder, setBankAccountHolder] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalAllowances = fixedAllowance + transportAllowance + mealAllowance;
  const totalDeductions = fixedDeduction + bpjsDeduction + taxDeduction;

  useEffect(() => {
    if (employee) {
      const s = employee.salary;
      setBasicSalary(s ? Number(s.basicSalary) : 5000000);
      setFixedAllowance(s?.fixedAllowance !== undefined ? Number(s.fixedAllowance) : (s ? Number(s.allowances) : 0));
      setTransportAllowance(s?.transportAllowance !== undefined ? Number(s.transportAllowance) : 0);
      setMealAllowance(s?.mealAllowance !== undefined ? Number(s.mealAllowance) : 0);

      setFixedDeduction(s?.fixedDeduction !== undefined ? Number(s.fixedDeduction) : (s ? Number(s.deductions) : 0));
      setBpjsDeduction(s?.bpjsDeduction !== undefined ? Number(s.bpjsDeduction) : 0);
      setTaxDeduction(s?.taxDeduction !== undefined ? Number(s.taxDeduction) : 0);

      setOvertimeRatePerHour(
        s?.overtimeRatePerHour !== undefined && s.overtimeRatePerHour !== null
          ? String(s.overtimeRatePerHour)
          : ''
      );
      setBankName(s?.bankName || 'BCA');
      setBankAccountNumber(s?.bankAccountNumber || s?.bankAccount || '');
      setBankAccountHolder(s?.bankAccountHolder || `${employee.firstName} ${employee.lastName || ''}`.trim());
      setNotes(s?.notes || '');
      setErrorMsg(null);
    }
  }, [employee]);

  // Standard hourly overtime formula default preview
  const defaultHourlyRate = Math.round(Number(basicSalary) / 173);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const payload: any = {
        employeeId: employee.id,
        basicSalary: Number(basicSalary),
        allowances: totalAllowances,
        fixedAllowance: Number(fixedAllowance),
        transportAllowance: Number(transportAllowance),
        mealAllowance: Number(mealAllowance),
        deductions: totalDeductions,
        fixedDeduction: Number(fixedDeduction),
        bpjsDeduction: Number(bpjsDeduction),
        taxDeduction: Number(taxDeduction),
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountHolder: bankAccountHolder.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (overtimeRatePerHour.trim() !== '') {
        payload.overtimeRatePerHour = Number(overtimeRatePerHour);
      } else {
        payload.overtimeRatePerHour = null;
      }

      const res = await fetch('/api/payroll/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan master gaji');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Gaji & Kompensasi"
      description={`Konfigurasi gaji pokok, tunjangan, potongan, dan rekening untuk ${employee?.firstName} ${employee?.lastName || ''} (${employee?.employeeId})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-slate-800">
            {employee?.firstName} {employee?.lastName} — {employee?.department?.name || 'Umum'}
          </p>
          <p className="text-slate-500">ID Karyawan: {employee?.employeeId}</p>
        </div>

        {/* Gaji Pokok */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Gaji Pokok (Rp) *
          </label>
          <Input
            type="number"
            min={0}
            step={50000}
            value={basicSalary}
            onChange={(e) => setBasicSalary(Number(e.target.value))}
            required
          />
        </div>

        {/* Tunjangan Section */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              Komponen Tunjangan
            </span>
            <span className="text-xs font-bold text-emerald-700">
              Total: Rp {totalAllowances.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Tunjangan Tetap (Rp)
              </label>
              <Input
                type="number"
                min={0}
                step={25000}
                value={fixedAllowance}
                onChange={(e) => setFixedAllowance(Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Tunjangan Transport (Rp)
              </label>
              <Input
                type="number"
                min={0}
                step={25000}
                value={transportAllowance}
                onChange={(e) => setTransportAllowance(Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Tunjangan Makan (Rp)
              </label>
              <Input
                type="number"
                min={0}
                step={25000}
                value={mealAllowance}
                onChange={(e) => setMealAllowance(Number(e.target.value))}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Potongan Section */}
        <div className="p-3.5 bg-rose-50/50 border border-rose-200/70 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Komponen Potongan Tetap & Asuransi
            </span>
            <span className="text-xs font-bold text-rose-700">
              Total: Rp {totalDeductions.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Potongan Tetap (Rp)
              </label>
              <Input
                type="number"
                min={0}
                step={25000}
                value={fixedDeduction}
                onChange={(e) => setFixedDeduction(Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                BPJS Ketenagakerjaan/Kes (Rp)
              </label>
              <Input
                type="number"
                min={0}
                step={25000}
                value={bpjsDeduction}
                onChange={(e) => setBpjsDeduction(Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Pajak PPh 21 (Opsional) (Rp)
              </label>
              <Input
                type="number"
                min={0}
                step={25000}
                value={taxDeduction}
                onChange={(e) => setTaxDeduction(Number(e.target.value))}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Lembur Config */}
        <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-blue-900">
              Tarif Lembur / Jam Kustom (Opsional)
            </label>
            <span className="text-[11px] text-blue-700 font-medium">
              Standar 1/173: Rp {defaultHourlyRate.toLocaleString('id-ID')}/jam
            </span>
          </div>
          <Input
            type="number"
            min={0}
            step={5000}
            value={overtimeRatePerHour}
            onChange={(e) => setOvertimeRatePerHour(e.target.value)}
            placeholder={`Kosongkan untuk otomatis (Rp ${defaultHourlyRate.toLocaleString('id-ID')}/jam)`}
            className="bg-white"
          />
          <p className="text-[11px] text-blue-600">
            Jika dikosongkan, upah lembur dihitung otomatis dengan formula standar (Gaji Pokok / 173) per jam kerja lembur disetujui.
          </p>
        </div>

        {/* Informasi Bank */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank</label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Contoh: BCA / Mandiri / BNI"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening</label>
            <Input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Atas Nama Rekening</label>
            <Input
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              placeholder="Nama pemilik rekening"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Catatan penyesuaian gaji..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Simpan Master Gaji'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
