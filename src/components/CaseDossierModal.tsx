'use client';

import React, { useState } from 'react';
import { InvestigationCase, Alert } from '@/../types/database';
import { formatDate } from '@/lib/utils';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Activity,
  Bot,
  Building,
  Layers,
  FileText,
  AlertOctagon,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface CaseDossierModalProps {
  caseItem: InvestigationCase | null;
  onClose: () => void;
  onStatusUpdated?: (updatedCase: InvestigationCase) => void;
}

export function CaseDossierModal({ caseItem, onClose, onStatusUpdated }: CaseDossierModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!caseItem) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white tracking-wide shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            CRITICAL SEVERITY
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white tracking-wide shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            HIGH RISK
          </span>
        );
      case 'MEDIUM':
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            MEDIUM PRIORITY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            LOW OPERATIONAL
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">OPEN</span>;
      case 'UNDER_INVESTIGATION':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">UNDER INVESTIGATION</span>;
      case 'ACTION_REQUIRED':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">ACTION REQUIRED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-purple-600 text-white">ESCALATED TO REGULATOR</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const handleUpdateStatus = async (newStatus: string, escalation?: string) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/intelligence/cases/${encodeURIComponent(caseItem.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          escalation_level: escalation,
          resolution_notes: resolutionNotes || undefined,
          assigned_investigator: 'State Drug Controller - Lead Investigator',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Update failed');
      if (onStatusUpdated) onStatusUpdated(json.data);
      setShowResolveForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update case');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20 font-bold">
                CASE: {caseItem.id}
              </span>
              {getSeverityBadge(caseItem.severity)}
              {getStatusBadge(caseItem.status)}
              {caseItem.occurrence_count > 1 && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {caseItem.occurrence_count} REPEATED OCCURRENCES
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{caseItem.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                First Detected: {formatDate(caseItem.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Last Activity: {formatDate(caseItem.last_detected_at)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Risk Score & Deterministic Signal Meter */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Priority Engine Evaluation
                </span>
                <span className="text-sm font-bold text-slate-800">
                  Multi-Factor Deterministic Safety Score
                </span>
              </div>
              <div className="flex items-baseline gap-1 self-start sm:self-auto">
                <span className="text-3xl font-black text-slate-900">{caseItem.risk_score}</span>
                <span className="text-sm font-semibold text-slate-500">/ 100</span>
              </div>
            </div>

            {/* Score progress bar */}
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  caseItem.risk_score >= 70
                    ? 'bg-rose-600'
                    : caseItem.risk_score >= 50
                    ? 'bg-amber-500'
                    : caseItem.risk_score >= 30
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, caseItem.risk_score))}%` }}
              />
            </div>

            {/* Explanation of signals */}
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Engine Rationale: </span>
              {caseItem.root_cause || 'Evaluated against pharmaceutical safety matrix.'}
            </div>
          </div>

          {/* AI Anomaly Factors (Isolation Forest Enhancement) */}
          {caseItem.anomaly_factors && caseItem.anomaly_factors.length > 0 && (
            <div className="p-5 rounded-2xl bg-violet-50/70 border border-violet-200">
              <div className="flex items-center gap-2 text-violet-900 font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>AI &amp; Statistical Anomaly Insights (Isolation Forest Detection)</span>
                {caseItem.anomaly_score !== undefined && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-200/80 text-violet-800 font-mono">
                    Anomaly Score: {(caseItem.anomaly_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-violet-800 mb-3">
                Identified deviations from baseline institutional supply chain behavior:
              </p>
              <div className="space-y-1.5">
                {caseItem.anomaly_factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs text-violet-900 bg-white/70 px-3 py-2 rounded-xl border border-violet-100"
                  >
                    <Bot className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity & Custody Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Primary Organization
              </div>
              <p className="text-sm font-bold text-slate-900">
                {caseItem.primary_org?.name || `Organization #${caseItem.primary_org_id}`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                Role: {caseItem.primary_org?.role || 'Supply Chain Entity'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Affected Batches
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {caseItem.affected_batches.map((b, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Assigned Stakeholder
              </div>
              <p className="text-sm font-bold text-slate-900 capitalize">
                {caseItem.assigned_stakeholder || 'Unassigned'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Escalation Level: <span className="font-semibold text-amber-700">{caseItem.escalation_level}</span>
              </p>
            </div>
          </div>

          {/* Investigation Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Audit &amp; Incident Timeline ({caseItem.timeline?.length || 0} events)
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {caseItem.timeline && caseItem.timeline.length > 0 ? (
                caseItem.timeline.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-200" />
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-800 uppercase tracking-wide">{entry.action}</span>
                        <span className="text-slate-400 font-mono">{formatDate(entry.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{entry.note}</p>
                      {entry.actor && (
                        <p className="text-[11px] text-slate-400 mt-1">Logged by: {entry.actor}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No historical timeline entries logged.</p>
              )}
            </div>
          </div>

          {/* Resolve Form Dialog */}
          {showResolveForm && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Formal Case Closure &amp; Corrective Action Record
              </h4>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter mandatory corrective action details, physical quarantine confirmation, or investigation resolution summary..."
                className="w-full text-xs p-3 rounded-xl border border-emerald-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[90px]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveForm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  disabled={isUpdating || !resolutionNotes.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Case Resolution
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Current Status: <span className="font-bold text-slate-800">{caseItem.status}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {caseItem.status === 'OPEN' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('UNDER_INVESTIGATION')}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5" />
                Acknowledge &amp; Investigate
              </button>
            )}

            {caseItem.status !== 'ESCALATED' && caseItem.status !== 'RESOLVED' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('ESCALATED', 'REGULATOR')}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Escalate for Regulatory Investigation
              </button>
            )}

            {caseItem.status !== 'RESOLVED' && !showResolveForm && (
              <button
                type="button"
                onClick={() => setShowResolveForm(true)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolve Case
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
