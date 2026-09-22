'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceSettingsSection } from '@/components/settings/AttendanceSettingsSection';
import { AccessDenied } from '@/components/ui/AccessDenied';

export default function AttendanceSettingsPage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user || data?.data || data;
        if (u?.role) setCurrentRole(u.role);
      })
      .catch(() => {});
  }, []);

  if (currentRole === 'EMPLOYEE') {
    return (
      <AccessDenied
        title="Akses Pengaturan Lokasi Dibatasi"
        message="Halaman konfigurasi lokasi kantor dan radius absensi hanya dapat diakses oleh Administrator."
        requiredRole="ADMIN"
        suggestedPath="/attendance"
        suggestedLabel="Buka Halaman Absensi"
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <AttendanceSettingsSection />
    </div>
  );
}
