import { AttendanceStatus, EmploymentStatus, LeaveStatus } from '@/types';

/**
 * Conditional classnames helper
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format standard date e.g. "17 Sep 2026"
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Return badge style config for attendance status
 */
export function getAttendanceStatusStyle(status: AttendanceStatus): {
  bg: string;
  text: string;
  dot: string;
  border: string;
} {
  switch (status) {
    case 'Present':
      return {
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        border: 'border-emerald-200',
      };
    case 'Late':
      return {
        bg: 'bg-amber-50 text-amber-700',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        border: 'border-amber-200',
      };
    case 'Absent':
      return {
        bg: 'bg-rose-50 text-rose-700',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        border: 'border-rose-200',
      };
    case 'Leave':
      return {
        bg: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
        border: 'border-blue-200',
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-700',
        text: 'text-slate-700',
        dot: 'bg-slate-400',
        border: 'border-slate-200',
      };
  }
}

/**
 * Return badge style config for leave status
 */
export function getLeaveStatusStyle(status: LeaveStatus): {
  bg: string;
  text: string;
  dot: string;
  border: string;
} {
  switch (status) {
    case 'Approved':
      return {
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        border: 'border-emerald-200',
      };
    case 'Pending':
      return {
        bg: 'bg-amber-50 text-amber-700',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        border: 'border-amber-200',
      };
    case 'Rejected':
      return {
        bg: 'bg-rose-50 text-rose-700',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        border: 'border-rose-200',
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-700',
        text: 'text-slate-700',
        dot: 'bg-slate-400',
        border: 'border-slate-200',
      };
  }
}

/**
 * Return badge style config for employment status
 */
export function getEmploymentStatusStyle(status: EmploymentStatus): {
  bg: string;
  text: string;
  dot: string;
  border: string;
} {
  switch (status) {
    case 'Active':
      return {
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        border: 'border-emerald-200',
      };
    case 'On Leave':
      return {
        bg: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
        border: 'border-blue-200',
      };
    case 'Inactive':
      return {
        bg: 'bg-slate-100 text-slate-600',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
        border: 'border-slate-200',
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-700',
        text: 'text-slate-700',
        dot: 'bg-slate-400',
        border: 'border-slate-200',
      };
  }
}
