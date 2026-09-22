'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Bell, Clock, AlertTriangle, LogOut, CheckCircle2 } from 'lucide-react';

export const NotificationSection: React.FC = () => {
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [shiftReminderMinutes, setShiftReminderMinutes] = useState(30);
  const [enableAttendanceReminder, setEnableAttendanceReminder] = useState(true);
  const [enableCheckoutReminder, setEnableCheckoutReminder] = useState(true);
  const [enableLateAlert, setEnableLateAlert] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings/attendance');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setEnableNotifications(data.enableNotifications !== false);
            setShiftReminderMinutes(data.shiftReminderMinutes ?? 30);
            setEnableAttendanceReminder(data.enableAttendanceReminder !== false);
            setEnableCheckoutReminder(data.enableCheckoutReminder !== false);
            setEnableLateAlert(data.enableLateAlert !== false);
          }
        }
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/settings/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableNotifications,
          shiftReminderMinutes: Number(shiftReminderMinutes),
          enableAttendanceReminder,
          enableCheckoutReminder,
          enableLateAlert,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Pengaturan notifikasi berhasil disimpan.' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: err.message || 'Gagal menyimpan pengaturan notifikasi.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const notificationToggles = [
    {
      title: 'Sistem Notifikasi Global',
      desc: 'Aktifkan atau nonaktifkan pengiriman semua jenis notifikasi dan pengingat internal.',
      checked: enableNotifications,
      toggle: () => setEnableNotifications(!enableNotifications),
      icon: Bell,
    },
    {
      title: 'Pengingat Absensi Masuk (Check-in)',
      desc: 'Kirim notifikasi kepada karyawan jika jam shift sudah mulai dan belum melakukan absensi masuk.',
      checked: enableAttendanceReminder && enableNotifications,
      disabled: !enableNotifications,
      toggle: () => setEnableAttendanceReminder(!enableAttendanceReminder),
      icon: Clock,
    },
    {
      title: 'Pengingat Absensi Pulang (Check-out)',
      desc: 'Kirim pengingat kepada karyawan yang telah check-in saat mendekati/melewati waktu akhir shift kerja.',
      checked: enableCheckoutReminder && enableNotifications,
      disabled: !enableNotifications,
      toggle: () => setEnableCheckoutReminder(!enableCheckoutReminder),
      icon: LogOut,
    },
    {
      title: 'Peringatan Keterlambatan Real-Time',
      desc: 'Notifikasi otomatis langsung terkirim ke karyawan saat check-in tercatat terlambat melewati toleransi.',
      checked: enableLateAlert && enableNotifications,
      disabled: !enableNotifications,
      toggle: () => setEnableLateAlert(!enableLateAlert),
      icon: AlertTriangle,
    },
  ];

  return (
    <Card className="border-slate-200/80 shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-900">
          Pengaturan Notifikasi & Pengingat
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Konfigurasi otomatisasi pengingat shift, batas waktu check-in/out, dan peringatan kehadiran tim.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100">
        {/* Toggle List */}
        {notificationToggles.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${
                item.disabled ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-start gap-3 pr-4">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 shrink-0 mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={item.toggle}
                disabled={item.disabled || isLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  item.checked ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    item.checked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}

        {/* Shift Reminder Lead Time Configuration */}
        <div
          className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            !enableNotifications ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">Waktu Pengingat Sebelum Shift</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Berapa menit sebelum jam kerja dimulai karyawan akan menerima pemberitahuan pengingat jadwal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={shiftReminderMinutes}
              onChange={(e) => setShiftReminderMinutes(Number(e.target.value))}
              disabled={!enableNotifications || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value={15}>15 Menit sebelum shift</option>
              <option value={30}>30 Menit sebelum shift (Default)</option>
              <option value={45}>45 Menit sebelum shift</option>
              <option value={60}>60 Menit (1 Jam) sebelum shift</option>
            </select>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
        <div>
          {feedback?.type === 'success' && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {feedback.message}
            </span>
          )}
          {feedback?.type === 'error' && (
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {feedback.message}
            </span>
          )}
          {!feedback && (
            <span className="text-xs text-slate-400">Perubahan akan langsung berpengaruh pada sistem reminder scheduler.</span>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="text-xs font-semibold"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </CardFooter>
    </Card>
  );
};
