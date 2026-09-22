import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface DepartmentOption {
  id: string;
  name: string;
}

interface AttendanceFiltersProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  departments?: DepartmentOption[];
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  selectedDate,
  onDateChange,
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedStatus,
  onStatusChange,
  departments = [],
}) => {
  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'LEAVE', label: 'On Leave' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Date Filter */}
      <div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          icon={<Calendar className="h-4 w-4 text-slate-400" />}
        />
      </div>

      {/* Employee Search */}
      <div>
        <Input
          placeholder="Search employee..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={<Search className="h-4 w-4 text-slate-400" />}
        />
      </div>

      {/* Department Filter */}
      <div>
        <Select
          value={selectedDepartment}
          onChange={(e) => onDepartmentChange(e.target.value)}
          options={departmentOptions}
        />
      </div>

      {/* Status Filter */}
      <div>
        <Select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          options={statusOptions}
        />
      </div>
    </div>
  );
};
