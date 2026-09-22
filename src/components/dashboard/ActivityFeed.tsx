import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ActivityItem } from '@/types';
import { Clock, CalendarCheck, FileText, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'attendance':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'leave':
        return <CalendarCheck className="h-4 w-4 text-blue-600" />;
      case 'employee':
        return <UserPlus className="h-4 w-4 text-emerald-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-600" />;
    }
  };

  const getIconBg = (type: ActivityItem['type']) => {
    switch (type) {
      case 'attendance':
        return 'bg-amber-50 border-amber-200';
      case 'leave':
        return 'bg-blue-50 border-blue-200';
      case 'employee':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>System actions and employee logs</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-4 hover:bg-slate-50/70 transition-colors"
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                  getIconBg(item.type)
                )}
              >
                {getIcon(item.type)}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {item.title}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </span>
                <span className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  {item.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
