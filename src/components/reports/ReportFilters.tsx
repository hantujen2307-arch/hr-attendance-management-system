'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  Filter,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Printer,
  FileText,
} from 'lucide-react';

interface DepartmentOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

interface ReportFiltersProps {
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  selectedMonth: number;
  onMonthChange: (val: number) => void;
  selectedYear: number;
  onYearChange: (val: number) => void;
  selectedDepartment: string;
  onDepartmentChange: (val: string) => void;
  selectedEmployee: string;
  onEmployeeChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  departments: DepartmentOption[];
  employees: EmployeeOption[];
  onApplyFilters: () => void;
  onReset: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  isExporting: boolean;
  isEmployeeRole?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  selectedDepartment,
  onDepartmentChange,
  selectedEmployee,
  onEmployeeChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchQueryChange,
  departments = [],
  employees = [],
  onApplyFilters,
  onReset,
  onExportExcel,
  onExportPdf,
  onPrint,
  isExporting,
  isEmployeeRole = false,
}) => {
  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const years = [
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ];

  const departmentOptions = [
    { value: 'all', label: 'Semua Unit Kerja' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const employeeOptions = [
    { value: 'all', label: 'Semua Karyawan' },
    ...employees.map((e) => ({
      value: e.id,
      label: `${e.firstName} ${e.lastName} (${e.employeeId})`,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'PRESENT', label: 'Hadir' },
    { value: 'LATE', label: 'Terlambat' },
    { value: 'LEAVE', label: 'Izin / Cuti' },
    { value: 'SICK', label: 'Sakit' },
    { value: 'BUSINESS_TRIP', label: 'Dinas' },
    { value: 'ABSENT', label: 'Alpha' },
  ];

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
      {/* Top Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Bulan */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Bulan
          </label>
          <Select
            value={String(selectedMonth)}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            options={months}
          />
        </div>

        {/* Tahun */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Tahun
          </label>
          <Select
            value={String(selectedYear)}
            onChange={(e) => onYearChange(Number(e.target.value))}
            options={years}
          />
        </div>

        {/* Tanggal Mulai Kustom */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Tanggal Mulai
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>

        {/* Tanggal Selesai Kustom */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Tanggal Selesai
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>

        {/* Unit Kerja (Hidden if Employee role) */}
        {!isEmployeeRole && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Unit Kerja
            </label>
            <Select
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              options={departmentOptions}
            />
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <Select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            options={statusOptions}
          />
        </div>
      </div>

      {/* Second Row: Search & Specific Employee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
        {/* Search by Name or NIP */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Cari Karyawan / NIP
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ketik nama karyawan atau NIP (EMP-001)..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Specific Employee Selection */}
        {!isEmployeeRole && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Pilih Karyawan Spesifik
            </label>
            <Select
              value={selectedEmployee}
              onChange={(e) => onEmployeeChange(e.target.value)}
              options={employeeOptions}
            />
          </div>
        )}
      </div>

      {/* Action Bar: Terapkan, Reset, Export Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onApplyFilters}
            className="gap-1.5 font-semibold text-xs shadow-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Terapkan Filter
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-1.5 text-xs text-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            Reset Filter
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            isLoading={isExporting}
            disabled={isExporting}
            className="gap-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Excel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            className="gap-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 hover:border-rose-300"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" />
            Export PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            Cetak
          </Button>
        </div>
      </div>
    </div>
  );
};
