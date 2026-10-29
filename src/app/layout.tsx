import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PwaClientLoader } from '@/components/pwa/PwaClientLoader';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'HR & Attendance Management System',
  description: 'Enterprise HR, Employee, Attendance, Shift & Payroll Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HR System',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white pb-[env(safe-area-inset-bottom,0px)]">
        <PwaClientLoader />
        {children}
      </body>
    </html>
  );
}

