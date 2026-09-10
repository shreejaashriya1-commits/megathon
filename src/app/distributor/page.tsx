'use client';

import React, { useEffect, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { ReturnRequest } from '@/../types/database';
import { PickupModal } from '@/components/PickupModal';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Truck,
  PackageCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  FileWarning,
  Camera,
  Layers,
  ArrowRight,
  QrCode,
  FileText,
  Settings as SettingsIcon,
  Printer,
} from 'lucide-react';
import { QrScanner } from '@/components/QrScanner';
import { QrVerificationConsole } from '@/components/QrVerificationConsole';

type TabType = 'incoming' | 'confirmed' | 'disputes' | 'qr' | 'reports' | 'settings';

export default function DistributorDashboard() {
  const { currentOrg } = useRole();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType;
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'incoming');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [modalMode, setModalMode] = useState<'confirm' | 'resolve'>('confirm');
  const [isPickupModalOpen, setIsPickupModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (tabParam && ['incoming', 'confirmed', 'disputes', 'qr', 'reports', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/returns');
      const json = await res.json();
      if (json.success && json.data) {
        setReturnRequests(json.data);
      }
    } catch (err) {
      console.error('Failed to load distributor returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleOpenPickup = (returnReq: ReturnRequest, mode: 'confirm' | 'resolve' = 'confirm') => {
    setSelectedReturn(returnReq);
    setModalMode(mode);
    setIsPickupModalOpen(true);
  };

  const pendingReturns = returnRequests.filter((r) => r.status === 'pending');
  const disputedReturns = returnRequests.filter((r) => r.status === 'disputed');
  const confirmedReturns = returnRequests.filter((r) => r.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#1769E0] flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1769E0] block">
              DISTRIBUTOR DASHBOARD
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0B1B3A]">{currentOrg.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 uppercase">
                Distributor Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reverse Logistics Intake, Custody Transfer &amp; Physical Verification Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-[#1769E0]" />
          <span>Chain of Custody Verifier</span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeTab === 'incoming'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Pending Returns</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-950 mt-1">{pendingReturns.length}</p>
          <span className="text-[10px] text-amber-700">Awaiting intake &amp; physical count</span>
        </button>

        <button
          onClick={() => setActiveTab('confirmed')}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeTab === 'confirmed'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>Confirmed Pickups</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-950 mt-1">{confirmedReturns.length}</p>
          <span className="text-[10px] text-emerald-700">In hub custody &bull; Ready for mfg</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeTab === 'disputes'
              ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-400/20'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between text-orange-800 text-xs font-semibold">
            <span>Disputes &amp; Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-3xl font-black text-orange-950 mt-1">{disputedReturns.length}</p>
          <span className="text-[10px] text-orange-700">Count mismatches requiring resolution</span>
        </button>

        <div className="p-5 rounded-2xl border text-left bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Today's Intake</span>
            <PackageCheck className="w-4 h-4 text-[#1769E0]" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {confirmedReturns.reduce((sum, r: any) => sum + (r.qty_received || r.qty_claimed || 0), 0)}{' '}
            <span className="text-sm font-semibold text-slate-500">units</span>
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Reconciled reverse volume</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Incoming Returns</span>
          {pendingReturns.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {pendingReturns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('confirmed')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'confirmed'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Confirmed Pickups</span>
          {confirmedReturns.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
              {confirmedReturns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'disputes'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Disputes</span>
          {disputedReturns.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-900">
              {disputedReturns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'qr'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR Verification</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* TAB 1: INCOMING RETURNS */}
      {activeTab === 'incoming' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Incoming Returns Queue</h2>
              <p className="text-xs text-slate-500">
                Reverse-chain shipments initiated by retail pharmacies requiring physical count intake
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Pending: {pendingReturns.length}
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Return ID</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Origin Retailer</th>
                  <th className="py-3 px-4">Qty Claimed</th>
                  <th className="py-3 px-4">Condition / Reason</th>
                  <th className="py-3 px-4">Initiated Date</th>
                  <th className="py-3 px-4 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading incoming queue...
                    </td>
                  </tr>
                ) : pendingReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No pending returns in queue. All pickups verified.
                    </td>
                  </tr>
                ) : (
                  pendingReturns.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #RET-{item.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/batch/${item.batch_number}`}
                          className="hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                        >
                          {item.batch_number}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.batch?.medicine?.name || 'Medicine'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{item.retailer?.name || 'Pharmacy'}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.qty_claimed} units</td>
                      <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                        {item.condition || 'Expired retail stock'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenPickup(item, 'confirm')}
                          className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-sm transition inline-flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-3.5 h-3.5" /> Confirm Pickup
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIRMED PICKUPS */}
      {activeTab === 'confirmed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Confirmed Pickups Ledger</h2>
              <p className="text-xs text-slate-500">
                Shipments physically received into distributor custody with signed OTP and vehicle verification
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Confirmed: {confirmedReturns.length}
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Return ID</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Origin Pharmacy</th>
                  <th className="py-3 px-4">Received Qty</th>
                  <th className="py-3 px-4">Logistics &amp; Driver</th>
                  <th className="py-3 px-4">OTP Verification</th>
                  <th className="py-3 px-4">Intake Date</th>
                  <th className="py-3 px-4 text-right">Batch 360</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {confirmedReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No confirmed pickups yet. Pickups confirmed from Incoming Returns will appear here.
                    </td>
                  </tr>
                ) : (
                  confirmedReturns.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #RET-{item.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.batch_number}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.batch?.medicine?.name || 'Medicine'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{item.retailer?.name || 'Pharmacy'}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-800">
                        {item.pickup?.qty_received ?? item.qty_claimed} units
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">Rajesh Kumar</div>
                        <div className="text-[10px] text-slate-400">Truck: RJ-14-GA-9021</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          OTP Verified #MED-{item.id + 8840}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {formatDate(item.pickup?.confirmed_at || item.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/batch/${item.batch_number}`}
                          className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-bold hover:underline"
                        >
                          View 360° <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISPUTES & DISCREPANCIES */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border-2 border-orange-200 p-5 rounded-2xl text-xs text-orange-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-orange-900">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Physical Intake Discrepancy Protocol</span>
            </div>
            <p className="text-orange-800 leading-relaxed">
              When physical count does not match the pharmacy&apos;s return manifest, MedTrace halts the batch lifecycle and marks the batch as <strong className="font-bold">DISPUTED</strong>. It cannot proceed to Manufacturer Destruction until the discrepancy is formally resolved and signed off by the distributor.
            </p>
          </div>

          {disputedReturns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">No Active Quantity Disputes</p>
              <p className="text-xs text-slate-500">
                All physical pickups match the pharmacy manifests without discrepancies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disputedReturns.map((item) => {
                const claimed = item.qty_claimed;
                const received = item.pickup?.qty_received ?? 0;
                const diff = received - claimed;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border-2 border-orange-300 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200 uppercase">
                          Return #RET-{item.id} &bull; Disputed
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5">
                          {item.batch?.medicine?.name || 'Medicine'}
                        </h3>
                        <p className="text-xs font-mono text-slate-500">Batch: {item.batch_number}</p>
                      </div>
                      <Link
                        href={`/batch/${item.batch_number}`}
                        className="text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1"
                      >
                        Ledger 360° <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Discrepancy Breakdown Card */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Claimed</span>
                        <p className="text-lg font-bold text-slate-900">{claimed}</p>
                        <span className="text-[9px] text-slate-400">Pharmacy</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-orange-700 uppercase">Received</span>
                        <p className="text-lg font-bold text-orange-950">{received}</p>
                        <span className="text-[9px] text-orange-600">Physical</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-rose-700 uppercase">Difference</span>
                        <p className="text-lg font-bold text-rose-900">
                          {diff > 0 ? `+${diff}` : diff}
                        </p>
                        <span className="text-[9px] text-rose-600">Mismatch</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div>
                        <span className="text-slate-400">Origin Pharmacy:</span>{' '}
                        <span className="font-semibold text-slate-800">{item.retailer?.name || 'Retailer'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Condition Notes:</span>{' '}
                        <span className="italic text-slate-700">{item.condition || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Logged:</span>{' '}
                        <span className="font-mono text-slate-700">{formatDate(item.created_at)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                        <FileWarning className="w-3.5 h-3.5" /> Blocked from destruction
                      </span>
                      <button
                        onClick={() => handleOpenPickup(item, 'resolve')}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Resolve Dispute
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QR VERIFICATION */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <QrVerificationConsole roleTitle="Distributor Logistics Hub" />
        </div>
      )}


      {/* Pickup & Dispute Modal */}
      <PickupModal
        isOpen={isPickupModalOpen}
        onClose={() => {
          setIsPickupModalOpen(false);
          setSelectedReturn(null);
        }}
        onSuccess={fetchReturns}
        returnRequest={selectedReturn}
        mode={modalMode}
      />
    </div>
  );
}
