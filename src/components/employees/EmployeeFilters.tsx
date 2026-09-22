'use client';

import React from 'react';
import { Search, RotateCcw, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DepartmentOption {
  id: string;
  name: string;
}

interface PositionOption {
  id: string;
  name: string;
}

interface EmployeeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (deptId: string) => void;
  selectedPosition: string;
  onPositionChange: (position: string) => void;
  departments: DepartmentOption[];
  positions: PositionOption[];
  onReset: () => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedDepartment,
  onDepartmentChange,
  selectedPosition,
  onPositionChange,
  departments,
  positions,
  onReset,
}) => {
  const isFiltered =
    searchQuery !== '' ||
    selectedStatus !== 'all' ||
    selectedDepartment !== 'all' ||
    selectedPosition !== 'all';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama, NIP, email, atau ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-2">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="all">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="ON_LEAVE">Cuti</option>
          </select>
        </div>

        {/* Unit Kerja Filter */}
        <div className="lg:col-span-3">
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="all">Semua Unit Kerja</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Jabatan Filter */}
        <div className="lg:col-span-2">
          <select
            value={selectedPosition}
            onChange={(e) => onPositionChange(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="all">Semua Jabatan</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.name}>
                {pos.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button */}
        <div className="lg:col-span-1 flex items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!isFiltered}
            className="w-full h-[38px] px-2 text-xs gap-1 border-slate-200 text-slate-600 hover:text-slate-900"
            title="Reset semua filter"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="sm:hidden lg:inline">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
