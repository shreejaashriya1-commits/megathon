'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Batch360Data } from '@/../types/medtrace';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { EvidenceViewer } from '@/components/EvidenceViewer';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Package,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileCheck2,
  Share2,
  RefreshCw,
  Eye,
} from 'lucide-react';

export default function Batch360Page() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useRole();
  const rawBatchNumber = params.batch_number as string;
  const batchNumber = decodeURIComponent(rawBatchNumber || '');

  const dashboardHref = `/${currentOrg?.role || 'retailer'}`;
  const dashboardLabel = currentOrg?.role ? `${currentOrg.role.charAt(0).toUpperCase() + currentOrg.role.slice(1)} Dashboard` : 'Dashboard';

  const [data, setData] = useState<Batch360Data | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence'>('timeline');

  const fetchBatchData = async () => {
    if (!batchNumber) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/batches/${encodeURIComponent(batchNumber)}/timeline`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching batch 360 data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchData();
  }, [batchNumber]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#1769E0] animate-spin" />
        <p className="font-bold text-sm">Compiling Batch 360° Digital Ledger...</p>
        <p className="text-xs text-slate-400 font-mono">Aggregating audit logs, custody transfers &amp; certificates</p>
      </div>
    );
  }

  if (!data || !data.batch) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Batch Not Found</h2>
        <p className="text-xs text-slate-500">
          No records could be found for batch identity <strong>"{batchNumber}"</strong>.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Return to {dashboardLabel}
          </Link>
        </div>
      </div>
    );
  }

  const { batch, isRegisteredDestroyed, certificate, destruction } = data;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769E0] hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm transition"
          >
            {dashboardLabel}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {isRegisteredDestroyed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              PERMANENT REGISTRY LOCKED (DESTROYED)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1769E0]" />
              ACTIVE TRACK &amp; TRACE
            </span>
          )}
        </div>
      </div>

      {/* Main Batch 360 Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1769E0] bg-blue-50 px-2 py-0.5 rounded">
                Batch 360° Complete Dossier
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-400 font-mono">QR: {batch.qr_token || 'N/A'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {batch.batch_number} • {batch.medicine?.name || 'Pharmaceutical Batch'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Generic: {batch.medicine?.generic_name} • Category: {batch.medicine?.category} • Form: {batch.medicine?.dosage_form}
            </p>
          </div>

          <div className="flex flex-col md:items-end gap-2">
            <StatusBadge status={batch.status} className="text-sm px-3 py-1" />
            {certificate && (
              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Cert #{certificate.certificate_no}
              </span>
            )}
          </div>
        </div>

        {/* 6 Key Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block">Batch Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{batch.batch_number}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block">Current Holder</span>
            <span className="font-bold text-slate-900">{batch.current_holder?.name || 'In Transit'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block">Initial Batch Stock</span>
            <span className="font-bold text-slate-900">{batch.quantity} units</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block">Manufacturing Date</span>
            <span className="font-mono text-slate-800">{formatDate(batch.mfg_date)}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block">Expiry Date</span>
            <span className="font-mono font-bold text-red-700">{formatDate(batch.expiry_date)}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block">Permanent Registry</span>
            <span className={`font-bold ${isRegisteredDestroyed ? 'text-rose-700' : 'text-slate-400'}`}>
              {isRegisteredDestroyed ? 'LOCKED' : 'NOT PRESENT'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Timeline vs Evidence */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'bg-[#1769E0] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Audit Lifecycle Timeline ({data.timeline.length} Events)
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'evidence'
                ? 'bg-[#1769E0] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            Photographic &amp; Certificate Evidence
          </button>
        </div>

        {/* TAB 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="pt-2">
            <Timeline events={data.timeline} />
          </div>
        )}

        {/* TAB 2: EVIDENCE */}
        {activeTab === 'evidence' && (
          <div className="pt-2">
            <EvidenceViewer data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
