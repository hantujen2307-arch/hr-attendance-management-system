'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmployeeRecord, EmployeeDetailedProfile } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  CalendarOff,
  Activity,
  User,
  ShieldCheck,
} from 'lucide-react';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
  onEdit?: (employee: EmployeeRecord) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'profil' | 'absensi' | 'pengajuan' | 'aktivitas'>('profil');
  const [detailedData, setDetailedData] = useState<EmployeeDetailedProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employee?.id) {
      setActiveTab('profil');
      fetchDetailedProfile(employee.id);
    }
  }, [isOpen, employee?.id]);

  const fetchDetailedProfile = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employees/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedData(data);
      }
    } catch (err) {
      console.error('Error fetching detailed profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const isInactive = employee.employmentStatus === 'INACTIVE';
  const isOnLeave = employee.employmentStatus === 'ON_LEAVE';
  const stats = detailedData?.stats;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Profil & Riwayat Karyawan"
      description="Informasi lengkap pegawai, statistik absensi aktual, pengajuan cuti, dan audit log"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Header Profile Summary Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                name={fullName}
                src={employee.photo || undefined}
                size="xl"
                className={`border-2 border-white shadow-xs ${isInactive ? 'grayscale' : ''}`}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{fullName}</h3>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {employee.employeeId}
                  </span>
                  <Badge
                    variant={
                      employee.employmentStatus === 'ACTIVE'
                        ? 'success'
                        : isOnLeave
                        ? 'info'
                        : 'neutral'
                    }
                    dot
                  >
                    {employee.employmentStatus === 'ACTIVE'
                      ? 'AKTIF'
                      : isOnLeave
                      ? 'CUTI'
                      : 'NONAKTIF'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                  {employee.position}
                  <span className="text-slate-300">•</span>
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  {employee.department?.name || '-'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {employee.email}
                  </span>
                  {employee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {employee.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Mulai: {formatDate(employee.joinDate)}
                  </span>
                </div>
              </div>
            </div>

            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                className="self-start sm:self-center text-xs"
              >
                Edit Profil
              </Button>
            )}
          </div>
        </div>

        {/* 4 Tabs Navigation */}
        <div className="flex border-b border-slate-200 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'profil'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-4 w-4" />
            Profil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('absensi')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'absensi'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            Absensi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pengajuan')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pengajuan'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarOff className="h-4 w-4" />
            Pengajuan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aktivitas')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'aktivitas'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            Aktivitas
          </button>
        </div>

        {/* Tab 1: Profil */}
        {activeTab === 'profil' && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  Informasi Pekerjaan
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID Karyawan (UUID):</span>
                    <span className="font-mono text-[11px] text-slate-700">{employee.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NIP:</span>
                    <span className="font-semibold text-slate-800">{employee.employeeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jabatan:</span>
                    <span className="font-semibold text-slate-800">{employee.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unit Kerja:</span>
                    <span className="font-semibold text-slate-800">{employee.department?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Bergabung:</span>
                    <span className="text-slate-800">{formatDate(employee.joinDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift Kerja:</span>
                    <span className="text-slate-800 font-medium">{employee.shift?.name || 'Reguler Office'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  Data Pribadi & Akun Login
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email Akun:</span>
                    <span className="text-slate-800 font-medium">{employee.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nomor Telepon:</span>
                    <span className="text-slate-800">{employee.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role Akun:</span>
                    <span className="font-semibold text-blue-600">{employee.user?.role || 'EMPLOYEE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Lahir:</span>
                    <span className="text-slate-800">{employee.birthDate ? formatDate(employee.birthDate) : '-'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">Alamat:</span>
                    <span className="text-slate-800 text-right max-w-[180px]">{employee.address || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Absensi */}
        {activeTab === 'absensi' && (
          <div className="space-y-4">
            {/* KPI Statistik Absensi (Hadir, Terlambat, Izin, Sakit, Dinas, Cuti, Alpha) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Hadir</p>
                <p className="text-lg font-bold text-emerald-800">{stats?.hadir ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Terlambat</p>
                <p className="text-lg font-bold text-amber-800">{stats?.terlambat ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-700 uppercase">Izin</p>
                <p className="text-lg font-bold text-blue-800">{stats?.izin ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
                <p className="text-[10px] font-bold text-purple-700 uppercase">Sakit</p>
                <p className="text-lg font-bold text-purple-800">{stats?.sakit ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
                <p className="text-[10px] font-bold text-cyan-700 uppercase">Dinas</p>
                <p className="text-lg font-bold text-cyan-800">{stats?.dinas ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                <p className="text-[10px] font-bold text-indigo-700 uppercase">Cuti</p>
                <p className="text-lg font-bold text-indigo-800">{stats?.cuti ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-center">
                <p className="text-[10px] font-bold text-rose-700 uppercase">Alpha</p>
                <p className="text-lg font-bold text-rose-800">{stats?.alpha ?? 0}</p>
              </div>
            </div>

            {/* Riwayat Absensi Terbaru */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Absensi Terbaru
              </h4>
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-400">Memuat data absensi...</div>
              ) : detailedData?.recentAttendances?.length ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Masuk</th>
                        <th className="py-2.5 px-3">Pulang</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Durasi Kerja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedData.recentAttendances.map((rec: any) => {
                        const checkInTime = rec.checkIn
                          ? new Date(rec.checkIn).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-';
                        const checkOutTime = rec.checkOut
                          ? new Date(rec.checkOut).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-';

                        const durationHours = rec.workingMinutes
                          ? `${Math.floor(rec.workingMinutes / 60)}j ${rec.workingMinutes % 60}m`
                          : '-';

                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {formatDate(rec.attendanceDate)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">{checkInTime}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">{checkOutTime}</td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant={
                                  rec.status === 'PRESENT'
                                    ? 'success'
                                    : rec.status === 'LATE'
                                    ? 'warning'
                                    : rec.status === 'ABSENT'
                                    ? 'danger'
                                    : 'info'
                                }
                                className="text-[10px] py-0 px-1.5"
                              >
                                {rec.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                              {durationHours}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500">
                  Belum ada catatan absensi untuk karyawan ini.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Pengajuan */}
        {activeTab === 'pengajuan' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Riwayat Pengajuan Cuti / Izin / Sakit / Dinas
            </h4>
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Memuat pengajuan...</div>
            ) : detailedData?.recentLeaves?.length ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Jenis</th>
                      <th className="py-2.5 px-3">Rentang Tanggal</th>
                      <th className="py-2.5 px-3 text-center">Durasi</th>
                      <th className="py-2.5 px-3">Alasan</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailedData.recentLeaves.map((leave: any) => (
                      <tr key={leave.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {leave.leaveType?.name || 'Izin'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatDate(leave.startDate)} s/d {formatDate(leave.endDate)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                          {leave.duration} hari
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[180px]" title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={
                              leave.status === 'APPROVED'
                                ? 'success'
                                : leave.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                            }
                            className="text-[10px] py-0 px-1.5"
                          >
                            {leave.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500">
                Belum ada pengajuan cuti, izin, sakit, atau dinas untuk karyawan ini.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Aktivitas (Audit Log) */}
        {activeTab === 'aktivitas' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Log Riwayat Aktivitas & Perubahan
            </h4>
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Memuat log aktivitas...</div>
            ) : detailedData?.auditLogs?.length ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {detailedData.auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 text-xs flex items-start gap-3 hover:bg-slate-50/50">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{log.action}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="text-slate-600">{log.details || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500">
                Belum ada log aktivitas yang tercatat untuk karyawan ini.
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
