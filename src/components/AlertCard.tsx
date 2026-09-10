'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertStatus } from '@/../types/database';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  Check,
  Building2,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface AlertCardProps {
  alert: Alert;
  onUpdate?: () => void;
}

export function AlertCard({ alert, onUpdate }: AlertCardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [resolutionNote, setResolutionNote] = useState<string>('');

  const getSeverityBadge = () => {
    switch (alert.severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50/70 border-rose-200 text-rose-950',
          badge: 'bg-rose-600 text-white',
          iconColor: 'text-rose-600',
        };
      case 'HIGH':
        return {
          bg: 'bg-red-50/70 border-red-200 text-red-950',
          badge: 'bg-red-700 text-white',
          iconColor: 'text-red-600',
        };
      case 'WARNING':
      default:
        return {
          bg: 'bg-amber-50/70 border-amber-200 text-amber-950',
          badge: 'bg-amber-600 text-white',
          iconColor: 'text-amber-600',
        };
    }
  };

  const getStatusBadge = () => {
    const status = alert.status || 'open';
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> RESOLVED
          </span>
        );
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
            <Search className="w-3 h-3 text-[#1769E0]" /> INVESTIGATING
          </span>
        );
      case 'open':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" /> OPEN
          </span>
        );
    }
  };

  const handleUpdateStatus = async (newStatus: AlertStatus, noteText?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alert.id,
          status: newStatus,
          notes: noteText || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Failed to update alert status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInvestigateClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (alert.status === 'open') {
      await handleUpdateStatus('investigating');
    }
    if (alert.batch_number) {
      router.push(`/batch/${encodeURIComponent(alert.batch_number)}`);
    }
  };

  const style = getSeverityBadge();

  return (
    <div className="relative">
      <Link
        href={`/batch/${encodeURIComponent(alert.batch_number || 'PCM2026A01')}`}
        className={`block p-4 sm:p-5 rounded-2xl border transition shadow-xs hover:shadow-md ${style.bg}`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Left: Icon & Alert Metadata */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className="p-2.5 rounded-xl bg-white shadow-xs border border-slate-200/80 shrink-0 mt-0.5">
              <ShieldAlert className={`w-5 h-5 ${style.iconColor}`} />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              {/* Top row: Badges, Batch ID, and Time */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${style.badge}`}>
                  {alert.severity}
                </span>

                {getStatusBadge()}

                {alert.batch_number && (
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    Batch: {alert.batch_number}
                  </span>
                )}

                <span className="text-xs text-slate-400">•</span>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDateTime(alert.created_at)}</span>
                </div>
              </div>

              {/* Offending Organization */}
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Attempted by:{' '}
                  <strong className="text-slate-900 font-bold">
                    {alert.attempted_by?.name || 'Retail Pharmacy'}
                  </strong>
                  {alert.attempted_by?.location && ` (${alert.attempted_by.location})`}
                </span>
              </div>

              {/* Violation description */}
              <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                {alert.reason}
              </p>
            </div>
          </div>

          {/* Right: Operational Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
            {/* Action: Investigate */}
            <span
              role="button"
              tabIndex={0}
              onClick={handleInvestigateClick}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold tracking-wide shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>{alert.status === 'open' ? 'Investigate' : 'View Batch 360°'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>

            {/* Action: Resolve (available for investigating or open) */}
            {alert.status !== 'resolved' ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowResolveModal(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Resolve</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Resolved
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Resolve Incident Dialog Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Resolve Compliance Incident</h4>
                <p className="text-xs text-slate-500 font-mono">Alert #{alert.id} • {alert.batch_number}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Regulator Findings &amp; Resolution Note</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Pharmacy inspected by field inspector; counterfeit batch seized and disposal verified."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleUpdateStatus('resolved', resolutionNote || 'Incident resolved and verified by regulatory inspector.');
                  setShowResolveModal(false);
                }}
                disabled={isUpdating}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Case Resolution</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
