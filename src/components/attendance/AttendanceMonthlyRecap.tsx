'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Building2,
  Users,
} from 'lucide-react';

interface RecapItem {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  present: number;
  late: number;
  leave: number;
  sick: number;
  businessTrip: number;
  absent: number;
  totalLogged: number;
}

interface AttendanceMonthlyRecapProps {
  departments: { id: string; name: string }[];
}

export const AttendanceMonthlyRecap: React.FC<AttendanceMonthlyRecapProps> = ({
  departments,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchName, setSearchName] = useState<string>('');
  const [recapData, setRecapData] = useState<RecapItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const years = [2025, 2026, 2027];

  const fetchRecap = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', String(selectedMonth));
      params.set('year', String(selectedYear));
      if (selectedDepartment !== 'all') {
        params.set('departmentId', selectedDepartment);
      }

      const res = await fetch(`/api/reports/recap?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecapData(data.recap || []);
      }
    } catch (err) {
      console.error('Failed to fetch monthly attendance recap:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedDepartment]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      // Month boundary dates
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(
        lastDay
      ).padStart(2, '0')}`;

      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (selectedDepartment !== 'all') {
        params.set('departmentId', selectedDepartment);
      }

      const response = await fetch(`/api/reports/attendance/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Gagal mengekspor data absensi');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap-absensi-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal mengekspor file excel/csv');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredRecap = recapData.filter((item) =>
    searchName ? item.name.toLowerCase().includes(searchName.toLowerCase()) : true
  );

  return (
    <div className="space-y-4">
      {/* Filter and Export Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Month Select */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Select */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Select */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Unit Kerja:</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Semua Unit Kerja</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Name */}
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecap}
                className="gap-1.5 text-xs"
                title="Refresh rekap"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                Refresh
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportExcel}
                isLoading={isExporting}
                disabled={isExporting}
                className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-2xs"
              >
                <FileSpreadsheet className="h-4 w-4" />
                EXPORT EXCEL / CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recap Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Unit Kerja</TableHead>
              <TableHead className="text-center font-bold text-emerald-700">Hadir</TableHead>
              <TableHead className="text-center font-bold text-amber-700">Terlambat</TableHead>
              <TableHead className="text-center font-bold text-blue-700">Izin</TableHead>
              <TableHead className="text-center font-bold text-orange-700">Sakit</TableHead>
              <TableHead className="text-center font-bold text-purple-700">Dinas</TableHead>
              <TableHead className="text-center font-bold text-rose-700">Alpha</TableHead>
              <TableHead className="text-center font-bold text-slate-700">Total Hari</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                  Memuat data rekapitulasi bulanan...
                </TableCell>
              </TableRow>
            ) : filteredRecap.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada data kehadiran untuk periode ini
                </TableCell>
              </TableRow>
            ) : (
              filteredRecap.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center text-xs font-mono text-slate-400">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <strong className="text-slate-900 text-xs block">{item.name}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.employeeId} • {item.position}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{item.department}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs font-mono">
                      {item.present}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-xs font-mono">
                      {item.late}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs font-mono">
                      {item.leave}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-bold text-xs font-mono">
                      {item.sick}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-xs font-mono">
                      {item.businessTrip}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs font-mono">
                      {item.absent}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs font-mono text-slate-800">
                    {item.totalLogged}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
