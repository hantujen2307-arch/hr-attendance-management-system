'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmployeeStats } from '@/types';
import { Users, UserCheck, UserX, Building2, Briefcase } from 'lucide-react';

interface EmployeeStatsCardsProps {
  stats: EmployeeStats | null;
  loading: boolean;
}

export const EmployeeStatsCards: React.FC<EmployeeStatsCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'TOTAL KARYAWAN',
      value: stats?.totalEmployees ?? 0,
      subtext: 'Terdaftar di sistem',
      icon: Users,
      bgColor: 'bg-blue-50 text-blue-600 border-blue-100',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      title: 'KARYAWAN AKTIF',
      value: stats?.activeEmployees ?? 0,
      subtext: 'Status aktif bertugas',
      icon: UserCheck,
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      title: 'KARYAWAN NONAKTIF',
      value: stats?.inactiveEmployees ?? 0,
      subtext: 'Riwayat data tetap tersimpan',
      icon: UserX,
      bgColor: 'bg-rose-50 text-rose-600 border-rose-100',
      iconBg: 'bg-rose-600 text-white',
    },
    {
      title: 'UNIT KERJA',
      value: stats?.totalDepartments ?? 0,
      subtext: 'Departemen aktif',
      icon: Building2,
      bgColor: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      iconBg: 'bg-indigo-600 text-white',
    },
    {
      title: 'JABATAN',
      value: stats?.totalPositions ?? 0,
      subtext: 'Posisi / jabatan kerja',
      icon: Briefcase,
      bgColor: 'bg-purple-50 text-purple-600 border-purple-100',
      iconBg: 'bg-purple-600 text-white',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-white border border-slate-200 p-4 animate-pulse flex flex-col justify-between"
          >
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-8 bg-slate-200 rounded w-1/3 my-1" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  {card.title}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </span>
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${card.iconBg} shadow-xs`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 truncate font-medium">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
