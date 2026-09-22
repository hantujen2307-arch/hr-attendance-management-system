'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmployeeRecord } from '@/types';
import {
  Upload,
  User,
  AlertCircle,
} from 'lucide-react';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: EmployeeRecord | null;
  departments: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
  departments,
  positions,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [position, setPosition] = useState('');
  const [customPosition, setCustomPosition] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'>('ACTIVE');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName || '');
      setLastName(employee.lastName || '');
      setEmployeeId(employee.employeeId || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setDepartmentId(employee.departmentId || '');
      setAddress(employee.address || '');
      setBirthDate(employee.birthDate ? employee.birthDate.split('T')[0] : '');
      setJoinDate(employee.joinDate ? employee.joinDate.split('T')[0] : '');
      setEmploymentStatus(employee.employmentStatus || 'ACTIVE');
      setPhotoPreview(employee.photo || null);

      // Position matching
      const foundPos = positions.find((p) => p.name.toLowerCase() === (employee.position || '').toLowerCase());
      if (foundPos) {
        setPosition(foundPos.name);
        setCustomPosition('');
      } else {
        setPosition('__CUSTOM__');
        setCustomPosition(employee.position || '');
      }
      setErrors({});
    }
  }, [employee]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'Hanya format JPG, PNG, atau WEBP yang didukung' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'Ukuran foto maksimal 2 MB' }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Nama depan wajib diisi';
    if (!employeeId.trim()) newErrors.employeeId = 'NIP wajib diisi';
    if (!email.trim()) newErrors.email = 'Email wajib diisi';
    if (!departmentId) newErrors.departmentId = 'Pilih unit kerja';

    const finalPosition = position === '__CUSTOM__' ? customPosition.trim() : position.trim();
    if (!finalPosition) newErrors.position = 'Pilih atau masukkan jabatan';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || '-',
        employeeId: employeeId.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        departmentId,
        position: finalPosition,
        joinDate: joinDate || undefined,
        birthDate: birthDate || null,
        address: address.trim() || null,
        employmentStatus,
        photo: photoPreview,
      };

      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          if (data.message?.toLowerCase().includes('nip') || data.message?.toLowerCase().includes('id')) {
            setErrors({ employeeId: data.message });
          } else if (data.message?.toLowerCase().includes('email')) {
            setErrors({ email: data.message });
          } else {
            setErrors({ form: data.message || 'Data duplikat' });
          }
        } else {
          setErrors({ form: data.message || 'Gagal memperbarui data karyawan' });
        }
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating employee:', err);
      setErrors({ form: 'Terjadi kesalahan sistem saat memperbarui data' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Data Karyawan"
      description={`Perbarui profil dan status kepegawaian untuk ${employee?.firstName || ''} ${employee?.lastName || ''}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Photo Section */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-xs shrink-0 flex items-center justify-center">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              Foto Profil
            </label>
            <p className="text-[11px] text-slate-500">
              Format JPG, PNG, atau WEBP (Maks 2MB).
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <label className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                Ganti Foto
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md"
                >
                  Hapus Foto
                </button>
              )}
            </div>
            {errors.photo && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.photo}</p>
            )}
          </div>
        </div>

        {/* Nama Depan & Belakang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Depan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
              }`}
            />
            {errors.firstName && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Belakang
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* NIP & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              NIP / Employee ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.employeeId ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
              }`}
            />
            {errors.employeeId && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.employeeId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Perusahaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'
              }`}
            />
            {errors.email && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Unit Kerja & Jabatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unit Kerja / Departemen <span className="text-rose-500">*</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jabatan / Posisi <span className="text-rose-500">*</span>
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="__CUSTOM__">+ Masukkan Jabatan Lainnya...</option>
            </select>

            {position === '__CUSTOM__' && (
              <input
                type="text"
                placeholder="Ketik nama jabatan..."
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {/* Telepon & Tanggal Mulai */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Telepon
            </label>
            <input
              type="text"
              placeholder="+62 812-3456-7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Mulai Kerja
            </label>
            <input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Alamat & Tanggal Lahir */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Domisili
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Lahir
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Status Kepegawaian
          </label>
          <select
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value as any)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="ON_LEAVE">Cuti</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? 'Menyimpan...' : 'Perbarui Karyawan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
