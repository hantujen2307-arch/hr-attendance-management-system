'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';

interface ImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
}

export const ImportEmployeesModal: React.FC<ImportEmployeesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departments,
  positions,
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Array<{ row: number; field: string; message: string }>>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const sampleDept = departments[0]?.name || 'IT';
    const samplePos = positions[0]?.name || 'Frontend Engineer';

    const headers = 'Nama Lengkap,NIP,Email,Nomor Telepon,Jabatan,Unit Kerja,Tanggal Mulai,Status';
    const sampleRows = [
      `Budi Santoso,EMP-011,budi.santoso@company.com,081234567890,${samplePos},${sampleDept},2026-09-01,AKTIF`,
      `Siti Rahma,EMP-012,siti.rahma@company.com,081298765432,HR Specialist,HR,2026-09-01,AKTIF`,
      `Dewi Anggraini,EMP-013,dewi.anggraini@company.com,081345678901,Accountant,Finance,2026-09-15,AKTIF`,
    ];

    const csvData = '\uFEFF' + [headers, ...sampleRows].join('\r\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_karyawan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setGeneralError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      setCsvContent(text);

      // Parse preview
      const lines = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsed = lines.slice(0, 6).map((line) => {
        const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        return match.map((val) => val.replace(/^"|"$/g, '').trim());
      });

      setPreviewRows(parsed);
    };

    reader.readAsText(file);
  };

  const resetForm = () => {
    setCsvContent('');
    setFileName('');
    setPreviewRows([]);
    setErrors([]);
    setGeneralError(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!csvContent) {
      setGeneralError('Silakan pilih file CSV terlebih dahulu');
      return;
    }

    try {
      setSubmitting(true);
      setErrors([]);
      setGeneralError(null);

      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          setErrors(data.errors);
          setGeneralError(`Ditemukan ${data.errors.length} kesalahan validasi data. Mohon periksa baris berikut.`);
        } else {
          setGeneralError(data.message || 'Gagal memproses import data karyawan');
        }
        return;
      }

      setSuccessMessage(`Berhasil mengimpor ${data.importedCount || previewRows.length - 1} data karyawan!`);
      setTimeout(() => {
        resetForm();
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error importing:', err);
      setGeneralError('Terjadi kesalahan sistem saat mengimpor data');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Data Karyawan Sekaligus"
      description="Unggah file CSV/Excel untuk mendaftarkan banyak karyawan sekaligus dengan validasi otomatis per baris"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Template Download Card */}
        <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Format Template Import</p>
              <p className="text-[11px] text-slate-600">
                Gunakan template standar dengan header: Nama Lengkap, NIP, Email, Nomor Telepon, Jabatan, Unit Kerja, Tanggal Mulai, Status.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="text-xs shrink-0 gap-1.5 bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <Download className="h-3.5 w-3.5" />
            DOWNLOAD TEMPLATE
          </Button>
        </div>

        {/* File Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {fileName ? fileName : 'Klik untuk memilih file CSV atau drag & drop ke sini'}
            </p>
            <p className="text-[11px] text-slate-400">File format .csv (UTF-8, delimitasi koma)</p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* General Error Alert */}
        {generalError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Row-by-Row Error Table */}
        {errors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Detail Kesalahan Validasi Per Baris:
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50/40 divide-y divide-rose-100 text-xs">
              {errors.map((err, i) => (
                <div key={i} className="p-2 flex items-start gap-2">
                  <span className="font-mono font-bold text-rose-800 shrink-0">
                    Baris {err.row}:
                  </span>
                  <span className="text-rose-700">{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview parsed rows */}
        {previewRows.length > 0 && errors.length === 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-700">
              Preview Data ({previewRows.length - 1} baris pertama):
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    {previewRows[0]?.map((head, idx) => (
                      <th key={idx} className="p-2 text-[11px] whitespace-nowrap">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 whitespace-nowrap text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleImport}
            disabled={submitting || !csvContent}
            className="gap-1.5"
          >
            {submitting ? 'Memvalidasi & Mengimpor...' : 'Mulai Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
