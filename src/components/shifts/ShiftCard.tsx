import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Shift } from '@/types';
import { Clock, Users, Coffee, Calendar } from 'lucide-react';

interface ShiftCardProps {
  shift: Shift;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ shift }) => {
  return (
    <Card className="hover:border-slate-300 transition-all">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{shift.name}</CardTitle>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold text-slate-800">
              {shift.startTime} – {shift.endTime}
            </span>
          </div>
        </div>
        <Badge variant={shift.status === 'Active' ? 'success' : 'neutral'} dot>
          {shift.status}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Coffee className="h-3.5 w-3.5 text-slate-400" />
            <span>Break: <strong>{shift.breakDuration}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>Employees: <strong>{shift.employeeCount}</strong></span>
          </div>
        </div>

        {/* Working Days */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Scheduled Days
          </span>
          <div className="flex gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const isScheduled = shift.days.includes(day);
              return (
                <span
                  key={day}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    isScheduled
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-300'
                  }`}
                >
                  {day[0]}
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
