'use client';

import React, { useState } from 'react';
import { QrScanner } from './QrScanner';
import { Batch } from '@/../types/database';
import { StatusBadge, ExpiryBadge } from './StatusBadge';
import { getExpiryStatus } from '@/lib/expiry';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  QrCode,
  Search,
  Camera,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Package,
  Building,
  Calendar,
  Layers,
} from 'lucide-react';

export function QrVerificationConsole({ roleTitle = 'Verification' }: { roleTitle?: string }) {
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('manual');
  const [manualBatch, setManualBatch] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [batchData, setBatchData] = useState<any | null>(null);
  const [registryStatus, setRegistryStatus] = useState<'LOCKED' | 'NOT_PRESENT' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyBatch = async (identifier: string) => {
    if (!identifier || !identifier.trim()) return;
    const cleanId = identifier.trim().toUpperCase();
    setIsVerifying(true);
    setErrorMessage(null);
    setBatchData(null);
    setRegistryStatus(null);

    try {
      // 1. Try resolving via QR token API first if identifier has token or lookup
      let batch: any = null;
      if (cleanId.includes('TOKEN')) {
        const qrRes = await fetch(`/api/batches/resolve?qr_token=${encodeURIComponent(cleanId)}`);
        const qrJson = await qrRes.json();
        if (qrJson.success && qrJson.data) {
          batch = qrJson.data;
        }
      }

      // 2. Fallback to direct batch number lookup
      if (!batch) {
        const res = await fetch(`/api/batches/${encodeURIComponent(cleanId)}/timeline`);
        const json = await res.json();
        if (json.success && json.data) {
          batch = json.data.batch;
          setRegistryStatus(json.data.isRegisteredDestroyed ? 'LOCKED' : 'NOT_PRESENT');
        } else {
          // Try standard batch list
          const bRes = await fetch(`/api/batches`);
          const bJson = await bRes.json();
          if (bJson.success && bJson.data) {
            const found = bJson.data.find(
              (b: any) =>
                b.batch_number.toUpperCase() === cleanId ||
                (b.qr_token && b.qr_token.toUpperCase() === cleanId)
            );
            if (found) {
              batch = found;
              setRegistryStatus(found.status === 'DESTROYED' ? 'LOCKED' : 'NOT_PRESENT');
            }
          }
        }
      }

      if (batch) {
        setBatchData(batch);
      } else {
        setErrorMessage(`Batch identifier "${cleanId}" was not found in the pharmaceutical ledger.`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to verify batch against server database.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setBatchData(null);
    setRegistryStatus(null);
    setErrorMessage(null);
    setManualBatch('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1769E0] flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0B1B3A]">QR Verification</h2>
            <p className="text-xs text-slate-500">
              Scan or enter a pharmaceutical batch to verify its compliance status.
            </p>
          </div>
        </div>
      </div>

      {/* Input Options: Option A (Camera) / Option B (Manual) */}
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
              activeMode === 'manual'
                ? 'bg-white text-[#1769E0] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4 text-[#1769E0]" />
            Enter Batch Number Manually
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
              activeMode === 'camera'
                ? 'bg-white text-[#1769E0] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-[#1769E0]" />
            Start Camera Scanner
          </button>
        </div>

        {/* Option A: Camera Scanner */}
        {activeMode === 'camera' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <QrScanner
              onScanSuccess={(token, batch) => {
                if (batch) verifyBatch(batch.batch_number);
                else verifyBatch(token);
              }}
            />
          </div>
        )}

        {/* Option B: Manual Input */}
        {activeMode === 'manual' && (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Batch Number / Identifier
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualBatch}
                  onChange={(e) => setManualBatch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') verifyBatch(manualBatch);
                  }}
                  placeholder="e.g. PCM2026A01, AMX-DEMO-001..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769E0]"
                />
              </div>
              <button
                type="button"
                onClick={() => verifyBatch(manualBatch)}
                disabled={isVerifying || !manualBatch.trim()}
                className="px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {isVerifying ? 'Verifying...' : 'Verify Batch'}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Quick test values:</span>
              <button
                type="button"
                onClick={() => {
                  setManualBatch('PCM2026A01');
                  verifyBatch('PCM2026A01');
                }}
                className="text-[#1769E0] font-mono font-semibold hover:underline"
              >
                PCM2026A01
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setManualBatch('AMX-DEMO-001');
                  verifyBatch('AMX-DEMO-001');
                }}
                className="text-[#1769E0] font-mono font-semibold hover:underline"
              >
                AMX-DEMO-001
              </button>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Verification Failed</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Successful Verification Result Card */}
        {batchData && (
          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {batchData.status === 'DESTROYED' ? (
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Verification Result
                  </span>
                  <h3 className="text-lg font-black text-slate-900 font-mono">
                    {batchData.batch_number}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={batchData.status} />
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  title="Scan Another"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Specification Fields Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Product</span>
                <span className="font-bold text-slate-900">
                  {batchData.medicine?.name || 'Paracetamol 650mg'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Manufacturer</span>
                <span className="font-bold text-slate-900">
                  {batchData.manufacturer?.name || 'Cipla Ltd'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Quantity</span>
                <span className="font-bold text-slate-900">{batchData.quantity} units</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Expiry Date</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-800">
                    {formatDate(batchData.expiry_date)}
                  </span>
                  <ExpiryBadge category={getExpiryStatus(batchData.expiry_date).category} />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Current State</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {batchData.status}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Registry Status</span>
                <span
                  className={`font-bold block mt-0.5 ${
                    registryStatus === 'LOCKED' || batchData.status === 'DESTROYED'
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {registryStatus === 'LOCKED' || batchData.status === 'DESTROYED'
                    ? 'PERMANENT REGISTRY LOCKED'
                    : 'ACTIVE SUPPLY CHAIN'}
                </span>
              </div>
            </div>

            {/* Link to Batch 360 */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Tamper-evident chain of custody server-side verification
              </span>
              <Link
                href={`/batch/${batchData.batch_number}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1769E0] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
              >
                Inspect Batch 360° <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
