import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  changeType = 'positive',
  colorScheme = 'blue',
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
    },
  };

  const scheme = colorMap[colorScheme];

  return (
    <Card className="hover:border-slate-300 transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">{title}</span>
          <div className={cn('p-2 rounded-lg', scheme.bg, scheme.text)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
          {change && (
            <div
              className={cn(
                'flex items-center text-xs font-semibold',
                changeType === 'positive' && 'text-emerald-600',
                changeType === 'negative' && 'text-rose-600',
                changeType === 'neutral' && 'text-slate-500'
              )}
            >
              {changeType === 'positive' ? (
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              ) : changeType === 'negative' ? (
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
              ) : null}
              {change}
            </div>
          )}
        </div>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 font-normal">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};
