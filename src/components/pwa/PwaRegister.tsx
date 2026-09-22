'use client';

import React, { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaRegister: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [dismissedInstall, setDismissedInstall] = useState<boolean>(false);

  useEffect(() => {
    // 1. Purge old caches and register Service Worker
    if (typeof window !== 'undefined') {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            if (name.includes('v2.0') || name.includes('v1')) {
              caches.delete(name);
            }
          });
        }).catch(() => {});
      }

      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              registration.update();
            })
            .catch((error) => {
              console.warn('[PWA] Service Worker registration failed:', error);
            });
        });
      }
    }

    // 2. Handle PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!sessionStorage.getItem('pwa-install-dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Online/Offline network status listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowInstallBanner(false);
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    }
    setDeferredPrompt(null);
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    setDismissedInstall(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  return (
    <>
      {/* Offline Status Warning Pill */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Anda sedang dalam mode Offline. Fitur absensi GPS & data terbaru memerlukan koneksi internet.</span>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && !dismissedInstall && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-40 bg-white border border-blue-200 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                Install Aplikasi HR System
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                Akses cepat absensi, shift, & notifikasi langsung dari layar utama
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="text-xs font-bold px-3 py-1.5 h-8 bg-blue-600 hover:bg-blue-700"
            >
              Install
            </Button>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
