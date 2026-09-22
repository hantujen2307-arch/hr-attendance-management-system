'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Invalid credentials. Please verify your email and password.');
        setIsLoading(false);
        return;
      }

      // Successful login - route to destination safely (prevent open redirect)
      let destination = '/dashboard';
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const from = params.get('from');
        if (
          from &&
          from.startsWith('/') &&
          !from.startsWith('//') &&
          !from.includes('\\') &&
          !from.includes(':')
        ) {
          destination = from;
        }
        window.location.href = destination;
        return;
      }
      router.push(destination);
      router.refresh();
    } catch (err) {
      console.error('Login request failed:', err);
      setErrorMessage('Failed to connect to authentication service. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePresetRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            HR & Attendance Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enter your workplace credentials to access your internal dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Workplace Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              icon={<Mail className="h-4 w-4" />}
              required
              disabled={isLoading}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={<Lock className="h-4 w-4" />}
              required
              disabled={isLoading}
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Password reset: Please contact your IT administrator.')}
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={isLoading}
            >
              <span>{isLoading ? 'Signing in...' : 'Sign in to Dashboard'}</span>
              {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </form>

          {/* Quick Demo Pre-fills for Portfolio Reviewers */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Quick Demo Accounts:
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handlePresetRole('admin@example.com')}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-medium transition-colors text-center cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handlePresetRole('hr@example.com')}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-medium transition-colors text-center cursor-pointer"
              >
                HR Lead
              </button>
              <button
                type="button"
                onClick={() => handlePresetRole('employee@example.com')}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-medium transition-colors text-center cursor-pointer"
              >
                Employee
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400">
          Internal Enterprise Application • Protected by JWT Session Authentication
        </p>
      </div>
    </div>
  );
}
