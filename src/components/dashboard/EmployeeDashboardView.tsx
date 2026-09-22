'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmployeeCheckInCard } from '@/components/attendance/EmployeeCheckInCard';
import { RecentAttendance } from '@/components/dashboard/RecentAttendance';
import {
  CalendarCheck,
  ClockAlert,
  CalendarOff,
  Clock,
  Briefcase,
  Layers,
  Timer,
} from 'lucide-react';

interface EmployeeDashboardData {
  attendanceThisMonth: number;
  lateThisMonth: number;
  leaveThisMonth: number;
  workingMinutesThisMonth: number;
  todayAttendance: any | null;
  overtimeThisMonth?: number;
  pendingOvertime?: number;
  approvedOvertimeMinutes?: number;
  currentShift: {
    id: string;
    name: string;
    code?: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    toleranceMinutes?: number;
    status: string;
  } | null;
  officeSetting?: {
    locationName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    workStartTime: string;
    toleranceMinutes: number;
    workEndTime: string;
  } | null;
}

interface EmployeeDashboardViewProps {
  data: EmployeeDashboardData;
  onRefresh: () => void;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({
  data,
  onRefresh,
}) => {
  const formatHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* 5 Personal Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Attendance this month */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Present This Month
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {data.attendanceThisMonth} <span className="text-xs font-normal text-slate-500">Days</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Recorded attendances</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Late this month */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Late Arrivals
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {data.lateThisMonth} <span className="text-xs font-normal text-slate-500">Times</span>
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Check-in after 09:00 WIB</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <ClockAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Leave this month */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Leave Taken
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {data.leaveThisMonth} <span className="text-xs font-normal text-slate-500">Days</span>
              </h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">Approved time off</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <CalendarOff className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Working Hours */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Work Duration
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {formatHours(data.workingMinutesThisMonth)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified work hours</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Overtime This Month */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overtime This Month
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {formatHours(data.approvedOvertimeMinutes || 0)}
              </h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                {data.overtimeThisMonth || 0} requests ({data.pendingOvertime || 0} pending)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
              <Timer className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance & Current Shift Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Check-In / Check-Out Widget */}
        <div className="lg:col-span-8">
          <EmployeeCheckInCard
            attendanceRecord={data.todayAttendance}
            officeSetting={data.officeSetting || undefined}
            onRefresh={onRefresh}
          />
        </div>

        {/* SHIFT HARI INI Information */}
        <div className="lg:col-span-4">
          <Card className="h-full border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">SHIFT HARI INI</CardTitle>
                    <CardDescription className="text-xs">Jadwal kerja & toleransi presensi</CardDescription>
                  </div>
                </div>
                <Badge
                  variant={data.todayAttendance?.checkIn ? 'success' : 'warning'}
                  dot
                  className="text-[10px]"
                >
                  {data.todayAttendance?.checkIn ? 'SUDAH ABSEN' : 'BELUM ABSEN'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-1 text-xs space-y-3">
              {data.currentShift ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">Nama Shift</span>
                      <span className="text-sm font-bold text-slate-800">
                        {data.currentShift.name}
                      </span>
                    </div>
                    {data.currentShift.code && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {data.currentShift.code}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-medium block text-[11px]">Jam Kerja</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {data.currentShift.startTime} – {data.currentShift.endTime} WIB
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-medium block text-[11px]">Toleransi Masuk</span>
                      <span className="font-semibold text-amber-700">
                        {data.currentShift.toleranceMinutes ?? 15} menit
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-medium block text-[11px]">Durasi Istirahat</span>
                      <span className="font-semibold text-slate-800">
                        {data.currentShift.breakMinutes} menit
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-medium block text-[11px]">Status Presensi</span>
                      <span className={`font-bold ${data.todayAttendance?.checkIn ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {data.todayAttendance?.checkIn ? 'SUDAH ABSEN' : 'BELUM ABSEN'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 flex flex-col items-center">
                  <Layers className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
                  <p className="font-semibold text-slate-600">Shift Kantor Reguler</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    08:00 – 17:00 WIB (Toleransi 15 menit)
                  </p>
                  <span className={`mt-2 text-xs font-bold ${data.todayAttendance?.checkIn ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {data.todayAttendance?.checkIn ? 'SUDAH ABSEN' : 'BELUM ABSEN'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Personal Recent Attendance Feed */}
      <div className="grid grid-cols-1 gap-6">
        <RecentAttendance />
      </div>
    </div>
  );
};
