import React from 'react';
import { BatchStatus } from '@/../types/database';
import { ExpiryCategory } from '@/../types/medtrace';
import { cn } from '@/lib/utils';
import { ShieldCheck, ArrowRightLeft, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: BatchStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200',
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
          ACTIVE
        </span>
      );
    case 'RETURN_INITIATED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200',
            className
          )}
        >
          <ArrowRightLeft className="w-3 h-3 text-amber-600" />
          RETURN INITIATED
        </span>
      );
    case 'RETURN_CONFIRMED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200',
            className
          )}
        >
          <ShieldCheck className="w-3 h-3 text-indigo-600" />
          RETURN CONFIRMED
        </span>
      );
    case 'DISPUTED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200',
            className
          )}
        >
          <AlertTriangle className="w-3 h-3 text-orange-600" />
          DISPUTED
        </span>
      );
    case 'DESTROYED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide bg-rose-50 text-rose-800 border border-rose-300 ring-1 ring-rose-500/20',
            className
          )}
        >
          <ShieldAlert className="w-3 h-3 text-rose-600" />
          DESTROYED (PERMANENT)
        </span>
      );
    default:
      return (
        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800', className)}>
          {status}
        </span>
      );
  }
}

interface ExpiryBadgeProps {
  category: ExpiryCategory;
  label?: string;
  className?: string;
}

export function ExpiryBadge({ category, label, className }: ExpiryBadgeProps) {
  switch (category) {
    case 'EXPIRED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-300',
            className
          )}
        >
          <AlertTriangle className="w-3 h-3 text-red-600" />
          {label || 'EXPIRED'}
        </span>
      );
    case 'URGENT':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300',
            className
          )}
        >
          <Clock className="w-3 h-3 text-amber-700" />
          {label || 'URGENT'}
        </span>
      );
    case 'EXPIRING_SOON':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-900 border border-yellow-300',
            className
          )}
        >
          <Clock className="w-3 h-3 text-yellow-700" />
          {label || 'EXPIRING SOON'}
        </span>
      );
    case 'NORMAL':
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200',
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {label || 'NORMAL'}
        </span>
      );
  }
}
