'use client';

import React, { useState, useEffect } from 'react';
import { EmployeeDetailedProfile, EmployeeRecord } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import {
  UserCircle,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarCheck,
  CalendarOff,
  Shield,
  Save,
} from 'lucide-react';

export default function EmployeeSelfProfilePage() {
  const [profileData, setProfileData] = useState<EmployeeDetailedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable fields state
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees/profile/me');
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        if (data.employee) {
          setPhone(data.employee.phone || '');
          setAddress(data.employee.address || '');
          setPhotoPreview(data.employee.photo || null);
        }
      } else {
        setErrorMessage('Gagal memuat profil pribadi karyawan.');
      }
    } catch (err) {
      console.error('Error fetching self profile:', err);
      setErrorMessage('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Hanya format JPG, PNG, atau WEBP yang didukung');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Ukuran foto maksimal 2 MB');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const payload = {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        photo: photoPreview || undefined,
      };

      const res = await fetch('/api/employees/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || 'Gagal menyimpan pembaruan profil');
        return;
      }

      setSuccessMessage('Profil Anda berhasil diperbarui!');
      fetchProfile();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error updating self profile:', err);
      setErrorMessage('Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-44 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!profileData?.employee) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Profil Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Akun Anda saat ini belum terhubung dengan data profil karyawan manapun. Silakan hubungi Administrator HR.
        </p>
      </div>
    );
  }

  const emp = profileData.employee;
  const fullName = `${emp.firstName} ${emp.lastName}`.trim();
  const stats = profileData.stats;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
            <UserCircle className="h-5 w-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            PROFIL SAYA
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Lihat informasi kepegawaian resmi dan perbarui nomor kontak, foto profil, serta alamat domisili Anda.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 shadow-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Header Summary */}
      <div className="p-5 bg-gradient-to-r from-slate-50 via-white to-blue-50/50 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              name={fullName}
              src={photoPreview || emp.photo || undefined}
              size="xl"
              className="border-2 border-white shadow-xs"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {emp.employeeId}
                </span>
                <Badge
                  variant={emp.employmentStatus === 'ACTIVE' ? 'success' : 'neutral'}
                  dot
                >
                  {emp.employmentStatus === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                {emp.position}
                <span className="text-slate-300">•</span>
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                {emp.department?.name || '-'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {emp.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Bergabung sejak {formatDate(emp.joinDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Hadir</p>
          <p className="text-xl font-bold text-emerald-800 mt-1">{stats?.hadir ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
          <p className="text-[10px] font-bold text-amber-700 uppercase">Terlambat</p>
          <p className="text-xl font-bold text-amber-800 mt-1">{stats?.terlambat ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
          <p className="text-[10px] font-bold text-blue-700 uppercase">Izin</p>
          <p className="text-xl font-bold text-blue-800 mt-1">{stats?.izin ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
          <p className="text-[10px] font-bold text-purple-700 uppercase">Sakit</p>
          <p className="text-xl font-bold text-purple-800 mt-1">{stats?.sakit ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
          <p className="text-[10px] font-bold text-cyan-700 uppercase">Dinas</p>
          <p className="text-xl font-bold text-cyan-800 mt-1">{stats?.dinas ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
          <p className="text-[10px] font-bold text-indigo-700 uppercase">Cuti</p>
          <p className="text-xl font-bold text-indigo-800 mt-1">{stats?.cuti ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
          <p className="text-[10px] font-bold text-rose-700 uppercase">Alpha</p>
          <p className="text-xl font-bold text-rose-800 mt-1">{stats?.alpha ?? 0}</p>
        </div>
      </div>

      {/* Main Form: Editable Fields vs Read-Only Fields */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editable Information */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Informasi Kontak & Domisili
              </h3>
              <p className="text-xs text-slate-500">
                Anda diizinkan memperbarui nomor telepon, alamat rumah, dan foto profil.
              </p>
            </div>
          </div>

          {/* Photo Uploader */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-xs shrink-0 flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-blue-600" />
                Ubah Foto Profil
              </label>
              <p className="text-[11px] text-slate-500">JPG, PNG, atau WEBP maks 2 MB.</p>
              <label className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs inline-block">
                Pilih Foto Baru
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62 812-3456-7890"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Domisili Tempat Tinggal
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Menteng Raya No. 12, Jakarta Pusat"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="gap-2 shadow-xs text-xs"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>

        {/* Right Column: Protected Business Fields (Read Only) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="h-4 w-4 text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Kepegawaian Resmi</h3>
              <p className="text-[11px] text-slate-500">Terkunci & hanya dapat diubah oleh Admin/HR</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">NIP / Nomor Induk Pegawai</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                {emp.employeeId}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Jabatan / Posisi</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{emp.position}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Unit Kerja / Departemen</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {emp.department?.name || '-'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Email Akun Perusahaan</span>
              <span className="font-medium text-slate-700 block mt-0.5">{emp.email}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Tanggal Mulai Kerja</span>
              <span className="text-slate-800 block mt-0.5">{formatDate(emp.joinDate)}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Status Kepegawaian</span>
              <span className="inline-block mt-0.5">
                <Badge variant={emp.employmentStatus === 'ACTIVE' ? 'success' : 'neutral'} dot>
                  {emp.employmentStatus}
                </Badge>
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
