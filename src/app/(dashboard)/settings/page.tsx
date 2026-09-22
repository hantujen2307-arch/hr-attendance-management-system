'use client';

import React, { useState, useEffect } from 'react';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { NotificationSection } from '@/components/settings/NotificationSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { AttendanceSettingsSection } from '@/components/settings/AttendanceSettingsSection';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { Settings as SettingsIcon, User, Lock, Bell, Palette, MapPin } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'attendance' | 'profile' | 'account' | 'notifications' | 'appearance'
  >('profile');
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        const u = user?.user || user?.data || user;
        if (u?.role) {
          setCurrentRole(u.role);
          if (u.role === 'ADMIN') {
            setIsAdmin(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (currentRole === 'EMPLOYEE') {
    return (
      <AccessDenied
        title="Akses Pengaturan Dibatasi"
        message="Halaman konfigurasi sistem dan absensi hanya dapat diakses oleh Administrator dan HR. Untuk mengelola data pribadi Anda, silakan buka menu Profil Saya."
        requiredRole="ADMIN / HR"
        suggestedPath="/employees/profile"
        suggestedLabel="Buka Profil Saya"
      />
    );
  }

  const tabs = [
    ...(isAdmin
      ? [{ id: 'attendance', label: 'Pengaturan Absensi', icon: MapPin }]
      : []),
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account & Security', icon: Lock },
    { id: 'notifications', label: 'Notification', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Settings</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal profile, account credentials, attendance configuration, and system preferences
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="max-w-4xl">
        {activeTab === 'attendance' && <AttendanceSettingsSection />}
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'account' && <AccountSection />}
        {activeTab === 'notifications' && <NotificationSection />}
        {activeTab === 'appearance' && <AppearanceSection />}
      </div>
    </div>
  );
}
