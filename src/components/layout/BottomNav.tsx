'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarOff,
  Banknote,
  Bell,
  Timer,
  Receipt,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface BottomNavProps {
  currentRole: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRole }) => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
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

  const navItems = [
    {
      name: 'Beranda',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      name: 'Presensi',
      href: '/attendance',
      icon: CalendarCheck,
      isActive: pathname.startsWith('/attendance'),
    },
    {
      name: 'Cuti',
      href: '/leave',
      icon: CalendarOff,
      isActive: pathname.startsWith('/leave'),
    },
    {
      name: currentRole === 'EMPLOYEE' ? 'Slip Gaji' : 'Lembur',
      href: currentRole === 'EMPLOYEE' ? '/payroll' : '/overtime',
      icon: currentRole === 'EMPLOYEE' ? Banknote : Timer,
      isActive: currentRole === 'EMPLOYEE' ? pathname.startsWith('/payroll') : pathname.startsWith('/overtime'),
    },
    {
      name: 'Notifikasi',
      href: '/notifications',
      icon: Bell,
      isActive: pathname.startsWith('/notifications'),
      badge: unreadCount,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 block lg:hidden bg-white/95 border-t border-slate-200/90 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors relative select-none touch-manipulation',
                active
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    'p-1 rounded-xl transition-all duration-200',
                    active ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[56px] text-center">
                {item.name}
              </span>
              {active && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
