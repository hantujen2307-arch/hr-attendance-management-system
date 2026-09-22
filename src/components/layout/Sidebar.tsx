'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarOff,
  Clock,
  Timer,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Building2,
  ShieldCheck,
  UserCircle,
  Banknote,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { UserRole, AuthUser } from '@/types';

interface SidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  className?: string;
  onCloseMobile?: () => void;
  user?: AuthUser | null;
  isLoading?: boolean;
}

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  allowedRoles?: UserRole[];
  employeeName?: string;
  employeeHref?: string;
  employeeIcon?: any;
}

export const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
  },
  {
    name: 'Manajemen Karyawan',
    href: '/employees',
    icon: Users,
    allowedRoles: ['ADMIN', 'HR'],
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: CalendarCheck,
    allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
  },
  {
    name: 'Pengajuan',
    href: '/leave',
    icon: CalendarOff,
    allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
    employeeName: 'Pengajuan Saya',
  },
  {
    name: 'Shifts',
    href: '/shifts',
    icon: Clock,
    allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
    employeeName: 'Shift Saya',
  },
  {
    name: 'Lembur',
    href: '/overtime',
    icon: Timer,
    allowedRoles: ['ADMIN', 'HR'],
  },
  {
    name: 'Rekap Absensi',
    href: '/reports',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'HR'],
  },
  {
    name: 'Penggajian',
    href: '/payroll',
    icon: Banknote,
    allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
    employeeName: 'Slip Gaji Saya',
    employeeHref: '/payroll',
    employeeIcon: Banknote,
  },
  {
    name: 'Reimbursement',
    href: '/reimbursement',
    icon: Receipt,
    allowedRoles: ['ADMIN', 'HR'],
  },
  {
    name: 'Notifikasi',
    href: '/notifications',
    icon: Bell,
    allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
  },
  {
    name: 'Profile',
    href: '/employees/profile',
    icon: UserCircle,
    allowedRoles: ['EMPLOYEE'],
    employeeName: 'Profile',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    allowedRoles: ['ADMIN', 'HR'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  onRoleChange,
  className,
  onCloseMobile,
  user: initialUser,
  isLoading = false,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadNotifCount, setUnreadNotifCount] = React.useState<number>(0);
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(initialUser || null);

  React.useEffect(() => {
    setAuthUser(initialUser || null);
  }, [initialUser]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (res.ok) {
          const json = await res.json();
          const userData = json.data || json;
          if (isMounted && userData && (userData.id || userData.email)) {
            setAuthUser(userData);
          }
        } else if (res.status === 401) {
          if (isMounted) setAuthUser(null);
        }
      } catch (e) {
        // silent error handling
      }
    };

    fetchProfile();
  }, [currentRole, pathname]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.unreadCount === 'number') {
            setUnreadNotifCount(data.unreadCount);
          }
        }
      } catch (e) {
        // silent error handling
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setAuthUser(null);
    window.location.href = '/login';
  };

  const getDisplayName = () => {
    const active = authUser || initialUser;
    if (active?.employee) {
      const first = active.employee.firstName || '';
      const last = active.employee.lastName || '';
      const full = `${first} ${last}`.trim();
      if (full) return full;
    }
    if (active?.email) {
      const prefix = active.email.split('@')[0];
      return prefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    }
    if (isLoading && !active) return 'Memuat...';
    const role = active?.role || currentRole;
    if (role === 'ADMIN') return 'Admin';
    if (role === 'HR') return 'HR';
    return 'Employee';
  };

  const getDisplayRole = () => {
    const active = authUser || initialUser;
    const role = active?.role || currentRole;
    if (role === 'ADMIN') return 'Admin';
    if (role === 'HR') return 'HR';
    return 'Employee';
  };

  const getAvatarPhoto = () => {
    const active = authUser || initialUser;
    if (active?.employee?.photo) {
      return active.employee.photo;
    }
    return undefined;
  };

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white select-none',
        className
      )}
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight text-slate-900 truncate">
              Enterprise HR
            </span>
            <span className="text-[11px] text-slate-500 truncate font-medium">
              Attendance System
            </span>
          </div>
        </div>

        {/* Active Role Indicator */}
        <div className="px-4 py-2.5 mx-3 mt-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            Role Akun
          </span>
          <Badge
            variant={currentRole === 'ADMIN' ? 'danger' : currentRole === 'HR' ? 'default' : 'neutral'}
            className="text-[10px] py-0.5 px-2 font-semibold"
          >
            {currentRole === 'EMPLOYEE' ? 'Karyawan' : currentRole}
          </Badge>
        </div>

        {/* Main Nav Items */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>
          {navigationItems
            .filter((item) => !item.allowedRoles || item.allowedRoles.includes(currentRole))
            .map((item) => {
              const isEmployeeRole = currentRole === 'EMPLOYEE';
              const itemName = isEmployeeRole && item.employeeName ? item.employeeName : item.name;
              const itemHref = isEmployeeRole && item.employeeHref ? item.employeeHref : item.href;
              const Icon = isEmployeeRole && item.employeeIcon ? item.employeeIcon : item.icon;

              const isActive =
                itemHref === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(itemHref);

              return (
                <Link
                  key={item.name}
                  href={itemHref}
                  onClick={onCloseMobile}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span className="truncate">{itemName}</span>
                {item.name === 'Notifikasi' && unreadNotifCount > 0 ? (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                ) : isActive ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Profile & Logout Area at the bottom of sidebar */}
      <div className="border-t border-slate-200 p-3 bg-slate-50/50">
        {isLoading && !authUser && !initialUser ? (
          <div className="flex items-center gap-3 p-2 rounded-lg animate-pulse w-full">
            <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-2.5 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200/80 transition-all">
            <Avatar
              name={getDisplayName()}
              src={getAvatarPhoto()}
              size="md"
              statusIndicator="online"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {getDisplayName()}
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {getDisplayRole()}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
