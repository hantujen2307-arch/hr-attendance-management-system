'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { BottomNav } from './BottomNav';
import { UserRole, AuthUser } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('EMPLOYEE');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const userData: AuthUser = json.data || json;
        if (userData && (userData.id || userData.email)) {
          setCurrentUser(userData);
          if (userData.role) {
            setCurrentRole(userData.role);
          }
        }
      } else if (res.status === 401) {
        setCurrentUser(null);
      }
    } catch (e) {
      // silent error handling
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          user={currentUser}
          isLoading={isLoadingUser}
        />
      </div>

      {/* Mobile Drawer (Accessible from header menu button) */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        user={currentUser}
        isLoading={isLoadingUser}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentRole={currentRole}
          onOpenMobileMenu={() => setMobileNavOpen(true)}
          user={currentUser}
          isLoading={isLoadingUser}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-24 lg:pb-8 bg-slate-50">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <BottomNav currentRole={currentRole} />
    </div>
  );
};

