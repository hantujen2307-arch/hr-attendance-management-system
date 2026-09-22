'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  XCircle,
  UserPlus,
  Megaphone,
  Check,
  ExternalLink,
  X,
} from 'lucide-react';
import { NotificationRecord, NotificationType } from '@/types';

function getNotificationIcon(type: NotificationType | string) {
  switch (type) {
    case 'LEAVE_APPROVED':
      return { icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    case 'LEAVE_REJECTED':
      return { icon: XCircle, bg: 'bg-rose-50 text-rose-600 border-rose-200' };
    case 'LEAVE_SUBMITTED':
      return { icon: Calendar, bg: 'bg-amber-50 text-amber-600 border-amber-200' };
    case 'SHIFT_REMINDER':
    case 'SHIFT_ASSIGNED':
    case 'SHIFT_CHANGED':
      return { icon: Clock, bg: 'bg-blue-50 text-blue-600 border-blue-200' };
    case 'ATTENDANCE_REMINDER':
    case 'CHECKOUT_REMINDER':
      return { icon: Clock, bg: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    case 'LATE_ATTENDANCE':
      return { icon: AlertCircle, bg: 'bg-rose-50 text-rose-600 border-rose-200' };
    case 'OVERTIME_APPROVED':
    case 'OVERTIME_REJECTED':
    case 'OVERTIME_SUBMITTED':
      return { icon: Clock, bg: 'bg-purple-50 text-purple-600 border-purple-200' };
    case 'PAYROLL_GENERATED':
    case 'PAYROLL_PROCESSED':
    case 'PAYROLL_PAID':
      return { icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    case 'REIMBURSEMENT_SUBMITTED':
    case 'REIMBURSEMENT_APPROVED':
    case 'REIMBURSEMENT_REJECTED':
    case 'REIMBURSEMENT_PAID':
      return { icon: CheckCircle2, bg: 'bg-teal-50 text-teal-600 border-teal-200' };
    case 'EMPLOYEE_CREATED':
      return { icon: UserPlus, bg: 'bg-purple-50 text-purple-600 border-purple-200' };
    case 'GENERAL_ANNOUNCEMENT':
    default:
      return { icon: Megaphone, bg: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

function getDestinationUrl(notification: NotificationRecord): string {
  switch (notification.type as string) {
    case 'LEAVE_SUBMITTED':
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
      return '/leave';
    case 'SHIFT_REMINDER':
    case 'SHIFT_ASSIGNED':
    case 'SHIFT_CHANGED':
      return '/shifts';
    case 'ATTENDANCE_REMINDER':
    case 'CHECKOUT_REMINDER':
    case 'LATE_ATTENDANCE':
      return '/attendance';
    case 'OVERTIME_SUBMITTED':
    case 'OVERTIME_APPROVED':
    case 'OVERTIME_REJECTED':
      return '/overtime';
    case 'PAYROLL_GENERATED':
    case 'PAYROLL_PROCESSED':
    case 'PAYROLL_PAID':
      return '/payroll';
    case 'REIMBURSEMENT_SUBMITTED':
    case 'REIMBURSEMENT_APPROVED':
    case 'REIMBURSEMENT_REJECTED':
    case 'REIMBURSEMENT_PAID':
      return '/reimbursement';
    case 'EMPLOYEE_CREATED':
      return notification.referenceId ? `/employees/${notification.referenceId}` : '/employees';
    default:
      return '/notifications';
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 172800) return 'Kemarin';

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<NotificationRecord | null>(null);

  const bellRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        const newCount = data.unreadCount ?? 0;

        // If count increased and not the initial load, fetch the newest notification for toast
        if (prevCountRef.current !== null && newCount > prevCountRef.current) {
          fetchLatestForToast();
        }
        prevCountRef.current = newCount;
        setUnreadCount(newCount);
      }
    } catch (e) {
      console.error('Failed to fetch unread notification count:', e);
    }
  };

  // Fetch latest for toast notification
  const fetchLatestForToast = async () => {
    try {
      const res = await fetch('/api/notifications?limit=1');
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          setToastMessage(data.data[0]);
          setTimeout(() => {
            setToastMessage(null);
          }, 6000);
        }
      }
    } catch (e) {
      console.error('Failed to fetch latest notification for toast:', e);
    }
  };

  // Fetch recent notifications for dropdown
  const fetchDropdownNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=5');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch dropdown notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and 30s polling
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // When dropdown opens, load latest items
  useEffect(() => {
    if (isOpen) {
      fetchDropdownNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
      fetchUnreadCount();
    }
  };

  // Mark single notification as read & navigate
  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (!notification.isRead) {
      try {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
      } catch (e) {
        console.error('Failed to mark notification as read:', e);
      }
    }

    setIsOpen(false);
    const dest = getDestinationUrl(notification);
    router.push(dest);
  };

  return (
    <div className="relative" ref={bellRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-label="Notifikasi"
        title="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Check className="h-3.5 w-3.5" />
                Tandai dibaca
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-xs">Memuat notifikasi...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-slate-700">Belum ada notifikasi</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aktivitas baru akan muncul di sini secara real-time.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const { icon: Icon, bg } = getNotificationIcon(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !item.isRead ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div
                      className={`shrink-0 rounded-xl p-2 border ${bg} transition-transform hover:scale-105`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-semibold truncate ${
                            !item.isRead ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 hover:underline">
                          Lihat detail <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-2 bg-slate-50/70 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-white rounded-lg transition-colors"
            >
              Lihat Semua Notifikasi &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Popup for New Notifications */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-blue-200 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifikasi Baru</span>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1">{toastMessage.title}</p>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                {toastMessage.message}
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const dest = getDestinationUrl(toastMessage);
                    setToastMessage(null);
                    router.push(dest);
                  }}
                  className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Buka
                </button>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
