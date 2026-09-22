'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  suggestedPath?: string;
  suggestedLabel?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = '403 - Akses Ditolak',
  message = 'Anda tidak memiliki izin atau hak akses untuk membuka halaman administrasi ini.',
  requiredRole = 'ADMIN / HR',
  suggestedPath = '/attendance',
  suggestedLabel = 'Halaman Absensi',
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 mb-2">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {message}
          </p>
          {requiredRole && (
            <p className="text-[11px] text-slate-400 mt-1">
              Hak akses yang diperlukan: <strong className="text-slate-700">{requiredRole}</strong>
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full gap-2 text-xs">
              <Home className="w-4 h-4" />
              Kembali ke Dashboard
            </Button>
          </Link>
          <Link href={suggestedPath} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-slate-200">
              <ArrowLeft className="w-4 h-4" />
              {suggestedLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
