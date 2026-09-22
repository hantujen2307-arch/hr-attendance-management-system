'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCheck,
  Check,
  Filter,
  ArrowRight,
  Send,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NotificationRecord, NotificationType, UserRole } from '@/types';

function getNotificationDetails(type: NotificationType | string) {
  switch (type) {
    case 'LEAVE_APPROVED':
      return {
        label: 'Cuti Disetujui',
        icon: CheckCircle2,
        badgeVariant: 'success' as const,
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      };
    case 'LEAVE_REJECTED':
      return {
        label: 'Cuti Ditolak',
        icon: XCircle,
        badgeVariant: 'danger' as const,
        iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      };
    case 'LEAVE_SUBMITTED':
      return {
        label: 'Pengajuan Cuti/Izin',
        icon: Calendar,
        badgeVariant: 'warning' as const,
        iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      };
    case 'SHIFT_REMINDER':
      return {
        label: 'Pengingat Shift',
        icon: Clock,
        badgeVariant: 'info' as const,
        iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      };
    case 'SHIFT_ASSIGNED':
      return {
        label: 'Shift Ditetapkan',
        icon: Clock,
        badgeVariant: 'info' as const,
        iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      };
    case 'SHIFT_CHANGED':
      return {
        label: 'Perubahan Shift',
        icon: Clock,
        badgeVariant: 'info' as const,
        iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      };
    case 'ATTENDANCE_REMINDER':
      return {
        label: 'Pengingat Check-in',
        icon: Clock,
        badgeVariant: 'neutral' as const,
        iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      };
    case 'CHECKOUT_REMINDER':
      return {
        label: 'Pengingat Check-out',
        icon: Clock,
        badgeVariant: 'neutral' as const,
        iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      };
    case 'LATE_ATTENDANCE':
      return {
        label: 'Keterlambatan',
        icon: AlertCircle,
        badgeVariant: 'danger' as const,
        iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      };
    case 'OVERTIME_APPROVED':
    case 'OVERTIME_REJECTED':
    case 'OVERTIME_SUBMITTED':
      return {
        label: 'Lembur',
        icon: Clock,
        badgeVariant: 'warning' as const,
        iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
      };
    case 'PAYROLL_GENERATED':
    case 'PAYROLL_PROCESSED':
    case 'PAYROLL_PAID':
      return {
        label: 'Penggajian',
        icon: CheckCircle2,
        badgeVariant: 'success' as const,
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      };
    case 'REIMBURSEMENT_SUBMITTED':
    case 'REIMBURSEMENT_APPROVED':
    case 'REIMBURSEMENT_REJECTED':
    case 'REIMBURSEMENT_PAID':
      return {
        label: 'Reimbursement',
        icon: CheckCircle2,
        badgeVariant: 'info' as const,
        iconBg: 'bg-teal-50 text-teal-600 border-teal-200',
      };
    case 'EMPLOYEE_CREATED':
      return {
        label: 'Karyawan Baru',
        icon: UserPlus,
        badgeVariant: 'default' as const,
        iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
      };
    case 'GENERAL_ANNOUNCEMENT':
    default:
      return {
        label: 'Pengumuman',
        icon: Megaphone,
        badgeVariant: 'default' as const,
        iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      };
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

function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Broadcast Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    role: 'ALL',
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch Current User
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCurrentUser(data.user || data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());

      if (filterTab === 'unread') {
        params.append('unreadOnly', 'true');
      }

      if (selectedCategory !== 'ALL') {
        params.append('type', selectedCategory);
      }

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setTotalCount(json.meta?.total || 0);
      }

      // Also get live unread count
      const unreadRes = await fetch('/api/notifications/unread-count');
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        setUnreadCount(unreadData.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filterTab, selectedCategory]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      fetchNotifications();
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  // Click card to mark as read and navigate
  const handleCardClick = (notification: NotificationRecord) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    const targetUrl = getDestinationUrl(notification);
    if (targetUrl !== '/notifications') {
      router.push(targetUrl);
    }
  };

  // Broadcast Announcement
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.title.trim() || !broadcastData.message.trim()) return;

    setIsBroadcasting(true);
    setBroadcastFeedback(null);
    try {
      const payload: any = {
        title: broadcastData.title,
        message: broadcastData.message,
        type: 'GENERAL_ANNOUNCEMENT',
      };

      if (broadcastData.role !== 'ALL') {
        payload.role = broadcastData.role;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setBroadcastFeedback({
          type: 'success',
          text: 'Pengumuman berhasil disiarkan ke seluruh penerima!',
        });
        setBroadcastData({ title: '', message: '', role: 'ALL' });
        setTimeout(() => {
          setShowBroadcastModal(false);
          setBroadcastFeedback(null);
          fetchNotifications();
        }, 1500);
      } else {
        const errorJson = await res.json();
        setBroadcastFeedback({
          type: 'error',
          text: errorJson.message || 'Gagal mengirim pengumuman.',
        });
      }
    } catch (err: any) {
      setBroadcastFeedback({
        type: 'error',
        text: err.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Client-side search filtering
  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(query) ||
      n.message.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-blue-600" />
            Notifikasi & Pengingat
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pusat pemantauan aktivitas tim, persetujuan cuti/izin, jadwal shift, dan presensi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            >
              <CheckCheck className="h-4 w-4 mr-1.5 text-blue-600" />
              Tandai Semua Dibaca
            </Button>
          )}

          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBroadcastModal(true)}
              className="text-xs font-semibold shadow-xs"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Kirim Pengumuman
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotifications}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800"
            title="Muat Ulang"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Control Bar: Tabs, Filter & Search */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setFilterTab('all');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Notifikasi ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterTab('unread');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  filterTab === 'unread'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Belum Dibaca</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-600 text-white text-[10px] px-1.5 py-0.2">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter by Category & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">Semua Jenis Notifikasi</option>
                  <option value="LEAVE_SUBMITTED">Pengajuan Izin/Cuti</option>
                  <option value="LEAVE_APPROVED">Cuti Disetujui</option>
                  <option value="LEAVE_REJECTED">Cuti Ditolak</option>
                  <option value="SHIFT_REMINDER">Pengingat Shift</option>
                  <option value="SHIFT_ASSIGNED">Shift Ditugaskan</option>
                  <option value="ATTENDANCE_REMINDER">Pengingat Check-in</option>
                  <option value="CHECKOUT_REMINDER">Pengingat Check-out</option>
                  <option value="LATE_ATTENDANCE">Keterlambatan Presensi</option>
                  <option value="EMPLOYEE_CREATED">Karyawan Baru</option>
                  <option value="GENERAL_ANNOUNCEMENT">Pengumuman HR</option>
                </select>
              </div>

              {/* Quick Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari judul/pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-xs text-slate-500 font-medium">Memuat data notifikasi...</span>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/40">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                <Bell className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {filterTab === 'unread'
                  ? 'Tidak ada notifikasi yang belum dibaca.'
                  : 'Belum ada notifikasi.'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {filterTab === 'unread'
                  ? 'Semua notifikasi telah Anda baca.'
                  : 'Aktivitas dan pembaruan sistem akan muncul di sini.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((item) => {
            const { label, icon: Icon, badgeVariant, iconBg } = getNotificationDetails(item.type);
            const destination = getDestinationUrl(item);

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                  !item.isRead
                    ? 'border-blue-200 bg-blue-50/25 hover:bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                {/* Left side: Icon + Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`shrink-0 rounded-xl p-2.5 border ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={badgeVariant} className="text-[10px] font-semibold uppercase">
                        {label}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDateDisplay(item.createdAt)}
                      </span>
                      {!item.isRead && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.2 text-[10px] font-bold text-white">
                          Baru
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-sm font-semibold tracking-tight ${
                        !item.isRead ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      title="Tandai telah dibaca"
                    >
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Dibaca</span>
                    </button>
                  )}

                  {destination !== '/notifications' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(item);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <span>Lihat Rincian</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500 font-medium">
            Halaman {currentPage} dari {totalPages} (Total {totalCount} data)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal (Admin & HR) */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kirim Pengumuman HR</h3>
                  <p className="text-xs text-slate-500">
                    Kirim notifikasi instan kepada tim atau seluruh staf.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {broadcastFeedback && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs font-medium ${
                  broadcastFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {broadcastFeedback.text}
              </div>
            )}

            <form onSubmit={handleBroadcastSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Penerima
                </label>
                <select
                  value={broadcastData.role}
                  onChange={(e) =>
                    setBroadcastData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">Semua Pengguna & Karyawan (Global)</option>
                  <option value="EMPLOYEE">Hanya Staff / Employee</option>
                  <option value="HR">Hanya Tim HR</option>
                  <option value="ADMIN">Hanya Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Perubahan Jam Kerja Ramadhan / Briefing All Hands"
                  value={broadcastData.title}
                  onChange={(e) =>
                    setBroadcastData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Isi Pesan Notifikasi *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tuliskan detail pengumuman yang akan diterima seluruh target penerima..."
                  value={broadcastData.message}
                  onChange={(e) =>
                    setBroadcastData((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBroadcastModal(false)}
                  disabled={isBroadcasting}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isBroadcasting}
                  className="text-xs font-semibold"
                >
                  {isBroadcasting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Kirim Sekarang
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
