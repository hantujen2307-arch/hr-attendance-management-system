'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Search,
  Menu,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { UserRole, AuthUser } from '@/types';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  currentRole: UserRole;
  onOpenMobileMenu: () => void;
  user?: AuthUser | null;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onOpenMobileMenu, user, isLoading }) => {
  const pathname = usePathname();

  // Generate page title and breadcrumb from route
  const getPageTitle = () => {
    if (pathname === '/dashboard') return { title: 'Dashboard', subtitle: 'Overview of HR metrics & attendance' };
    if (pathname === '/employees') return { title: 'Employee Directory', subtitle: 'Manage organization team members' };
    if (pathname.startsWith('/employees/')) return { title: 'Employee Profile', subtitle: 'Detailed staff records & performance' };
    if (pathname === '/attendance') return { title: 'Attendance Log', subtitle: 'Daily check-in and check-out tracking' };
    if (pathname === '/leave') return { title: 'Leave Management', subtitle: 'Review and approve employee time-off' };
    if (pathname === '/shifts') return { title: 'Shift Schedules', subtitle: 'Manage working hours and shift rosters' };
    if (pathname === '/overtime') return { title: 'Manajemen Lembur', subtitle: 'Pengajuan dan persetujuan lembur karyawan' };
    if (pathname === '/payroll') return { title: 'Penggajian & Slip Gaji', subtitle: 'Master gaji, periode, dan slip gaji karyawan' };
    if (pathname === '/reimbursement') return { title: 'Klaim Reimbursement', subtitle: 'Pengajuan biaya dan persetujuan klaim' };
    if (pathname === '/recruitment') return { title: 'Recruitment & Pelamar', subtitle: 'Lowongan kerja, tahapan seleksi, dan pelamar' };
    if (pathname === '/reports') return { title: 'Reports & Analytics', subtitle: 'Attendance summaries and exportable data' };
    if (pathname === '/notifications') return { title: 'Notifikasi & Pengingat', subtitle: 'Pemberitahuan aktivitas, shift, dan presensi' };
    if (pathname === '/settings') return { title: 'Settings', subtitle: 'System preferences & personal profile' };
    return { title: 'HR System', subtitle: 'Management portal' };
  };

  const { title, subtitle } = getPageTitle();

  const getDisplayName = () => {
    if (user?.employee) {
      const first = user.employee.firstName || '';
      const last = user.employee.lastName || '';
      const full = `${first} ${last}`.trim();
      if (full) return full;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    }
    if (!user) return 'Memuat...';
    if (currentRole === 'ADMIN') return 'Administrator';
    if (currentRole === 'HR') return 'HR Lead';
    return 'Karyawan';
  };

  const getAvatarSrc = () => {
    if (user?.employee?.photo) {
      return user.employee.photo;
    }
    return undefined;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
      {/* Left: Mobile trigger & Page Titles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
            {title}
          </h1>
          <span className="hidden sm:inline-block text-xs text-slate-500 mt-0.5">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Right: Search, Notifications, User info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search records, staff, ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
          />
        </div>

        {/* Live Notification Bell */}
        <NotificationBell />

        {/* Role Pill */}
        <Badge
          variant={currentRole === 'ADMIN' ? 'danger' : currentRole === 'HR' ? 'default' : 'neutral'}
          className="hidden sm:inline-flex text-[11px] font-semibold"
        >
          {currentRole === 'ADMIN' ? 'Admin' : currentRole === 'HR' ? 'HR' : 'Employee'}
        </Badge>

        {/* User Avatar Mini */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-200" title={isLoading || !user ? 'Memuat profil...' : getDisplayName()}>
          {isLoading || !user ? (
            <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
          ) : (
            <Avatar
              name={getDisplayName()}
              src={getAvatarSrc()}
              size="sm"
              statusIndicator="online"
            />
          )}
        </div>
      </div>
    </header>
  );
};
