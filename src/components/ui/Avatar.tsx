import React, { useState } from 'react';
import { cn, getPhotoUrl } from '@/lib/utils';
import Image from 'next/image';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  statusIndicator?: 'online' | 'offline' | 'busy' | 'away';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  statusIndicator,
  className,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const resolvedSrc = src ? getPhotoUrl(src) : undefined;

  const getInitials = (text: string) => {
    const parts = text.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
    xl: 'h-16 w-16 text-xl',
  };

  const indicatorSizes = {
    sm: 'h-2 w-2 ring-1',
    md: 'h-2.5 w-2.5 ring-2',
    lg: 'h-3 w-3 ring-2',
    xl: 'h-4 w-4 ring-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    busy: 'bg-rose-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-400',
  };

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700 border border-slate-200 overflow-hidden select-none',
        sizes[size],
        className
      )}
      {...props}
    >
      {resolvedSrc && !imageError ? (
        <Image
          src={resolvedSrc}
          alt={name}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}

      {statusIndicator && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-white',
            statusColors[statusIndicator],
            indicatorSizes[size]
          )}
        />
      )}
    </div>
  );
};
