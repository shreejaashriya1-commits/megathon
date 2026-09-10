'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { QrScanner } from './QrScanner';
import { Batch } from '@/../types/database';
import { SaleAttemptResult } from '@/../types/medtrace';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Camera,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
} from 'lucide-react';
import Link from 'next/link';

export function SaleSimulator() {
  const { currentOrg } = useRole();
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [manualBatch, setManualBatch] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<SaleAttemptResult | null>(null);
  const [lastScannedBatchNumber, setLastScannedBatchNumber] = useState<string | null>(null);

  const handleSaleAttempt = async (batchNumber: string) => {
    if (!batchNumber || !batchNumber.trim()) return;
    const targetBatch = batchNumber.trim().toUpperCase();
    setLastScannedBatchNumber(targetBatch);
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await fetch('/api/sale-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: targetBatch,
          retailer_org_id: currentOrg.id,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      } else {
        setResult({
          blocked: true,
          message: json.error || 'Unknown sale verification failure',
        });
      }
    } catch (err: any) {
      setResult({
        blocked: true,
        message: err?.message || 'Network error communicating with MedTrace Fraud Engine',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanSuccess = async (token: string, batch?: Batch) => {
    if (batch) {
      await handleSaleAttempt(batch.batch_number);
    } else {
      await handleSaleAttempt(token);
    }
  };

  const handleReset = () => {
    setResult(null);
    setLastScannedBatchNumber(null);
    setManualBatch('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#0B1B3A] text-white p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1769E0] animate-pulse" />
              <h2 className="text-xl font-bold tracking-tight">Point-of-Sale / Dispense Verification</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Active tamper &amp; re-entry defense: Scans query the permanent <code>batch_registry</code> and live expiry engine.
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-800 text-slate-300 font-mono text-xs rounded-lg border border-slate-700">
            Node: {currentOrg.name}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* INPUT STAGE (if no result yet) */}
        {!result && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                  activeTab === 'qr'
                    ? 'bg-white text-[#1769E0] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4 text-[#1769E0]" />
                Hardware Camera QR Scanner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  activeTab === 'manual'
                    ? 'bg-white text-[#1769E0] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manual Batch Number Entry
              </button>
            </div>

            {activeTab === 'qr' && (
              <div className="space-y-3">
                <QrScanner
                  onScanSuccess={handleScanSuccess}
                  onSwitchToManual={() => setActiveTab('manual')}
                />
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Enter Pharmaceutical Batch Identity
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualBatch}
                    onChange={(e) => setManualBatch(e.target.value.toUpperCase())}
                    placeholder="e.g. AMX-DEMO-001 or PCM2026A01"
                    className="flex-1 px-4 py-2.5 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1769E0] uppercase bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaleAttempt(manualBatch)}
                    disabled={isProcessing || !manualBatch.trim()}
                    className="px-6 py-2.5 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    {isProcessing ? 'Verifying...' : 'Verify Sale'}
                  </button>
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  <span>Quick Test Links: </span>
                  <button
                    type="button"
                    onClick={() => {
                      setManualBatch('AMX-DEMO-001');
                      handleSaleAttempt('AMX-DEMO-001');
                    }}
                    className="text-rose-700 underline font-semibold mr-3 hover:text-rose-900"
                  >
                    Test Destroyed (AMX-DEMO-001)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualBatch('PCM2026A01');
                      handleSaleAttempt('PCM2026A01');
                    }}
                    className="text-amber-700 underline font-semibold mr-3 hover:text-amber-900"
                  >
                    Test Expired (PCM2026A01)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualBatch('AZI-2026-088');
                      handleSaleAttempt('AZI-2026-088');
                    }}
                    className="text-[#1769E0] underline font-semibold hover:text-blue-900"
                  >
                    Test Valid Active (AZI-2026-088)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROCESSING SPINNER */}
        {isProcessing && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-600 animate-pulse">
            <div className="w-12 h-12 border-4 border-[#1769E0] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold text-sm">Evaluating with MedTrace Fraud Engine...</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">Querying immutable registry &amp; audit records</p>
          </div>
        )}

        {/* RESULTS STAGE */}
        {result && !isProcessing && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
            {/* ALLOWED RESULT */}
            {!result.blocked && (
              <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-blue-500/5 border-2 border-emerald-500 text-center space-y-4 shadow-xl">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-xs uppercase tracking-wider mb-2">
                    VERIFIED &amp; UNEXPIRED
                  </span>
                  <h3 className="text-3xl font-black text-emerald-950 tracking-tight">SALE ALLOWED</h3>
                  <p className="text-sm font-medium text-emerald-800 mt-1 max-w-md mx-auto">
                    {result.message}
                  </p>
                </div>

                {result.batch && (
                  <div className="max-w-md mx-auto bg-white p-4 rounded-xl border border-emerald-200 text-left text-xs space-y-1.5 shadow-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Medicine:</span>
                      <span className="font-bold text-slate-900">{result.batch.medicine?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Batch Number:</span>
                      <span className="font-mono font-bold text-slate-900">{result.batch.batch_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expiry Date:</span>
                      <span className="font-semibold text-emerald-800">{result.batch.expiry_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-emerald-700">ACTIVE</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BLOCKED RESULT */}
            {result.blocked && (
              <div className="p-8 rounded-3xl bg-gradient-to-b from-red-500/15 to-rose-500/5 border-3 border-red-600 text-center space-y-5 shadow-2xl">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/30 animate-bounce">
                  <ShieldAlert className="w-12 h-12" />
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-sm">
                      DEFENSE TRIGGERED
                    </span>
                    {result.severity && (
                      <span
                        className={`px-3 py-1 rounded-full font-black text-xs uppercase tracking-widest ${
                          result.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-200 border border-rose-600'
                            : result.severity === 'HIGH'
                            ? 'bg-red-800 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        SEVERITY: {result.severity}
                      </span>
                    )}
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-black text-red-950 tracking-tight">
                    {result.destroyedAt ? 'SALE BLOCKED — BATCH RE-ENTRY DETECTED' : 'SALE BLOCKED'}
                  </h3>

                  <p className="text-base font-bold text-red-900 mt-2 max-w-lg mx-auto bg-red-100/70 py-2 px-4 rounded-xl border border-red-200">
                    {result.message}
                  </p>
                </div>

                {/* Evidence / Proof details */}
                <div className="max-w-lg mx-auto bg-white p-5 rounded-2xl border border-red-200 text-left text-xs space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800">Permanent Ledger Verification</span>
                    <span className="font-mono text-red-700 font-bold">{lastScannedBatchNumber}</span>
                  </div>

                  {result.destroyedAt && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-950">
                      <div className="font-bold text-[11px] uppercase tracking-wider text-rose-800 flex items-center justify-between">
                        <span>BATCH RE-ENTRY DETECTED</span>
                        <span className="font-mono font-bold">{lastScannedBatchNumber}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-rose-200/60">
                        <div><span className="text-slate-500">Batch:</span> <strong className="font-mono text-slate-900 ml-1">{lastScannedBatchNumber}</strong></div>
                        <div><span className="text-slate-500">Current State:</span> <strong className="text-rose-900 ml-1">DESTROYED</strong></div>
                        <div><span className="text-slate-500">Decision:</span> <strong className="text-rose-900 ml-1">BLOCKED</strong></div>
                        <div><span className="text-slate-500">Severity Level:</span> <strong className="text-rose-900 ml-1">{result.severity || 'HIGH'}</strong></div>
                      </div>
                      {result.severity === 'CRITICAL' && (
                        <div className="pt-1 text-[11px] font-bold text-rose-900 border-t border-rose-200/60">
                          Repeated Attempt: CRITICAL (Escalated Alert)
                        </div>
                      )}
                    </div>
                  )}

                  {result.destroyedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Terminal Destruction Date:</span>
                      <strong className="text-red-950">
                        {new Date(result.destroyedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </strong>
                    </div>
                  )}

                  {result.certificateNo && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Destruction Certificate Ref:</span>
                      <strong className="font-mono text-slate-900">{result.certificateNo}</strong>
                    </div>
                  )}

                  {result.facilityName && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Incineration Facility:</span>
                      <span className="font-medium text-slate-800">{result.facilityName}</span>
                    </div>
                  )}

                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-red-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Regulator Alert Broadcasted:</strong>
                      <p className="text-[11px] text-red-800 mt-0.5">
                        A blocked scan and {result.severity || 'CRITICAL'} compliance alert have been instantly committed to the State Drug Controller audit log.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 bg-[#0B1B3A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" /> Scan Another Package
              </button>

              {lastScannedBatchNumber && (
                <Link
                  href={`/batch/${lastScannedBatchNumber}`}
                  className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1769E0] border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4 text-[#1769E0]" />
                  Inspect Batch 360° Timeline
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
