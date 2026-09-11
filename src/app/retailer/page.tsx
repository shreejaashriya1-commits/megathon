'use client';

import React, { useEffect, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { Batch, ReturnRequest, InvestigationCase } from '@/../types/database';
import { getExpiryStatus } from '@/lib/expiry';
import { StatusBadge, ExpiryBadge } from '@/components/StatusBadge';
import { ReturnModal } from '@/components/ReturnModal';
import { SaleSimulator } from '@/components/SaleSimulator';
import { QrVerificationConsole } from '@/components/QrVerificationConsole';
import { CaseDossierModal } from '@/components/CaseDossierModal';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  Package,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RotateCcw,
  ShoppingCart,
  QrCode,
  Search,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Filter,
  MoreVertical,
  Shield,
  XCircle,
  HelpCircle,
  ArrowRight,
  Printer,
  ChevronRight,
  FolderOpen,
  Bot,
} from 'lucide-react';

export default function RetailerDashboard() {
  const { currentOrg } = useRole();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'dashboard');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [selectedBatchForReturn, setSelectedBatchForReturn] = useState<Batch | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchRetailerData = async () => {
    setIsLoading(true);
    try {
      const resBatches = await fetch(`/api/batches?org_id=${currentOrg.id}`);
      const jsonBatches = await resBatches.json();
      if (jsonBatches.success && jsonBatches.data) {
        setBatches(jsonBatches.data);
      }

      const resReturns = await fetch(`/api/returns?org_id=${currentOrg.id}`);
      const jsonReturns = await resReturns.json();
      if (jsonReturns.success && jsonReturns.data) {
        const myReturns = jsonReturns.data.filter(
          (r: ReturnRequest) => r.retailer_org_id === currentOrg.id
        );
        setReturnRequests(myReturns);
      }

      const resCases = await fetch(`/api/intelligence/cases?stakeholder=retailer`);
      const jsonCases = await resCases.json();
      if (jsonCases.success && jsonCases.data) {
        setCases(jsonCases.data);
      }
    } catch (err) {
      console.error('Failed to load retailer inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailerData();
  }, [currentOrg.id]);

  // Derived metrics matching reference design
  const totalBatches = batches.length;
  const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const expiredBatchesCount = batches.filter(
    (b) => getExpiryStatus(b.expiry_date).category === 'EXPIRED'
  ).length;
  const returnedBatchesCount = batches.filter(
    (b) => b.status === 'RETURN_INITIATED' || b.status === 'RETURN_CONFIRMED'
  ).length;
  const pendingReturnsCount = returnRequests.filter(
    (r) => r.status === 'pending'
  ).length;

  const filteredBatches = batches.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      b.batch_number.toLowerCase().includes(q) ||
      (b.medicine?.name || '').toLowerCase().includes(q) ||
      (b.manufacturer?.name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleInitiateReturn = (batch?: Batch) => {
    setSelectedBatchForReturn(batch || null);
    setIsReturnModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER CARD (Matches Reference Screenshot Pixel-by-Pixel)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1769E0] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0B1B3A] tracking-tight">
                <span>RETAILER DASHBOARD</span> <span className="text-slate-400 font-normal">/</span> <span>{currentOrg.name}</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Manage your inventory, returns and compliance activities.
            </p>
          </div>
        </div>

        {/* Right Callout Banner */}
        <div className="bg-[#EFF6FF] border border-blue-200/80 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-blue-950 font-medium max-w-md shadow-2xs">
          <Shield className="w-5 h-5 text-[#1769E0] fill-[#1769E0]/20 shrink-0" />
          <span>MedTrace detects re-entry attempts involving known destroyed batch identities.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 4 KPI METRIC CARDS (Total Batches, Pending Returns, Alerts, Scans)       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Batches */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Batches</span>
            <span className="text-2xl font-bold text-[#0B1B3A] leading-tight block">
              {totalBatches}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              {activeBatchesCount} Active | {expiredBatchesCount} Expired | {returnedBatchesCount} Returned
            </span>
          </div>
        </div>

        {/* Card 2: Pending Returns */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Pending Returns</span>
            <span className="text-2xl font-bold text-[#0B1B3A] leading-tight block">
              {pendingReturnsCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              {pendingReturnsCount} Awaiting Distributor Pickup
            </span>
          </div>
        </div>

        {/* Card 3: Compliance Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Compliance Alerts</span>
            <span className="text-2xl font-bold text-[#0B1B3A] leading-tight block">0</span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
              All Systems Normal
            </span>
          </div>
        </div>

        {/* Card 4: QR Scans Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#1769E0] flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">QR Scans Today</span>
            <span className="text-2xl font-bold text-[#0B1B3A] leading-tight block">7</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              2 Verifications | 5 Sales Checks
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW SELECTOR (Hidden Tab Navigation for Test Support)                 */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'dashboard' || activeTab === 'inventory'
              ? 'bg-[#1769E0] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0B1B3A] hover:bg-slate-100'
          }`}
        >
          Inventory Ledger ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'returns'
              ? 'bg-[#1769E0] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0B1B3A] hover:bg-slate-100'
          }`}
        >
          Return Requests ({returnRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('dispense')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'dispense' || activeTab === 'qr'
              ? 'bg-[#1769E0] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0B1B3A] hover:bg-slate-100'
          }`}
        >
          Sell / Dispense Verification
        </button>
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'cases'
              ? 'bg-[#1769E0] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0B1B3A] hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Compliance Cases ({cases.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3B. TAB: COMPLIANCE & INVESTIGATION CASES                                */}
      {/* ========================================================================= */}
      {activeTab === 'cases' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned Pharmacy Compliance Cases</h2>
              <p className="text-xs text-slate-500">
                Actionable incidents routed specifically to this dispensing pharmacy (e.g. shelf-life expiry, delivery discrepancies)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#1769E0] border border-blue-200 text-xs font-bold">
              {cases.length} Active Cases
            </span>
          </div>

          {cases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">No Open Compliance Issues</p>
              <p className="text-slate-400 text-[11px]">All dispensed and inventoried batches are fully compliant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {c.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.severity === 'CRITICAL'
                            ? 'bg-rose-600 text-white'
                            : c.severity === 'HIGH'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {c.severity}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {c.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600">{c.root_cause || c.category}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Batches: {c.affected_batches.join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{c.risk_score}</span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCase(c)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1769E0] text-white hover:bg-blue-700 transition flex items-center gap-1"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA                                                      */}
      {/* ========================================================================= */}
      {(activeTab === 'dashboard' || activeTab === 'inventory') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ------------------------------------------------------------------- */}
          {/* LEFT 8 COLUMNS: BATCH INVENTORY & PERMISSIONS                       */}
          {/* ------------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-6">
            {/* Batch Inventory Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Card Header with Search & Filter */}
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0B1B3A] leading-tight">
                      Batch Inventory
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      View and manage your pharmaceutical batches
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search batch number, product or manufacturer..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1769E0] focus:bg-white transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === 'ALL'
                          ? 'ACTIVE'
                          : statusFilter === 'ACTIVE'
                          ? 'RETURN_INITIATED'
                          : 'ALL'
                      )
                    }
                    className="px-3 py-1.5 bg-[#1769E0] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Batch No.</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Manufacturer</th>
                      <th className="py-3 px-4">Qty (Available)</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No pharmaceutical batches found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((batch) => {
                        const expiry = getExpiryStatus(batch.expiry_date);
                        const isExpired = expiry.category === 'EXPIRED';
                        const isInitiated = batch.status === 'RETURN_INITIATED';
                        const isConfirmed = batch.status === 'RETURN_CONFIRMED';
                        const isDestroyed = batch.status === 'DESTROYED';

                        return (
                          <tr
                            key={batch.batch_number}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* Batch No */}
                            <td className="py-3.5 px-4 font-mono font-bold text-[#0B1B3A]">
                              <Link
                                href={`/batch/${batch.batch_number}`}
                                className="hover:text-[#1769E0] transition"
                              >
                                {batch.batch_number}
                              </Link>
                            </td>

                            {/* Product */}
                            <td className="py-3.5 px-4 text-slate-800 font-semibold">
                              {batch.medicine?.name || 'Paracetamol 650mg'}
                            </td>

                            {/* Manufacturer */}
                            <td className="py-3.5 px-4 text-slate-600">
                              {batch.manufacturer?.name || 'Cipla Ltd'}
                            </td>

                            {/* Qty */}
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {batch.quantity} <span className="text-xs font-normal text-slate-500">units</span>
                            </td>

                            {/* Expiry Date */}
                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              <div>{batch.expiry_date}</div>
                              {isExpired && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 mt-0.5">
                                  EXPIRED
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {isDestroyed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                  DESTROYED
                                </span>
                              ) : isConfirmed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  RETURN CONFIRMED
                                </span>
                              ) : isInitiated ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  RETURN INITIATED
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ACTIVE
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isExpired && batch.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() => handleInitiateReturn(batch)}
                                    className="px-3 py-1.5 bg-[#1769E0] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                                  >
                                    Initiate Return
                                  </button>
                                ) : batch.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() => setActiveTab('dispense')}
                                    className="px-3 py-1.5 bg-[#1769E0] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                                  >
                                    Sell / Dispense
                                  </button>
                                ) : (
                                  <Link
                                    href={`/batch/${batch.batch_number}`}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                                  >
                                    Audit 360°
                                  </Link>
                                )}
                                <Link
                                  href={`/batch/${batch.batch_number}`}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                                  title="View Full Ledger History"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Your Role & Permissions Card (Matches Reference Screenshot) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1769E0] text-white flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0B1B3A] uppercase tracking-wider">
                    Your Role &amp; Permissions
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">
                    As a Retailer, you can initiate returns, verify sales/dispense, and view your inventory.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Initiate Returns
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dispense/Sell Verification
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4 text-slate-300" /> Confirm Pickup
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4 text-slate-300" /> Record Destruction
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4 text-slate-300" /> Issue Certificate
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* RIGHT 4 COLUMNS: QUICK ACTIONS & RECENT ACTIVITY                    */}
          {/* ------------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#0B1B3A] font-bold text-sm">
                <Clock className="w-4 h-4 text-[#1769E0]" />
                <h3>Quick Actions</h3>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleInitiateReturn()}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-xs font-semibold text-slate-800 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center group-hover:bg-[#1769E0] group-hover:text-white transition">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <span>Initiate Return</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dispense')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-xs font-semibold text-slate-800 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center group-hover:bg-[#1769E0] group-hover:text-white transition">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span>Verify QR / Batch</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setActiveTab('inventory');
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-xs font-semibold text-slate-800 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center group-hover:bg-[#1769E0] group-hover:text-white transition">
                      <Package className="w-4 h-4" />
                    </div>
                    <span>View All Batches</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <Link
                  href="/batch/PCM2026A01"
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-xs font-semibold text-slate-800 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center group-hover:bg-[#1769E0] group-hover:text-white transition">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span>Batch 360° Audit Ledger</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#0B1B3A] font-bold text-sm">
                <Clock className="w-4 h-4 text-[#1769E0]" />
                <h3>Recent Activity</h3>
              </div>

              <div className="space-y-3.5">
                {/* Event 1 */}
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0 mt-0.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 leading-tight">
                      Return initiated for PCM2026A01
                    </p>
                    <span className="text-[11px] text-slate-400">Today 10:24 AM</span>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 leading-tight">
                      Batch AMX-DEMO-001 verified
                    </p>
                    <span className="text-[11px] text-slate-400">Today 09:52 AM</span>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-rose-700 leading-tight">
                      Sale blocked - Destroyed batch
                    </p>
                    <span className="text-[11px] text-slate-400">Today 09:31 AM</span>
                  </div>
                </div>

                {/* Event 4 */}
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 leading-tight">
                      Login successful
                    </p>
                    <span className="text-[11px] text-slate-400">Today 08:15 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 2: RETURN REQUESTS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B1B3A]">Return Requests Ledger</h2>
              <p className="text-xs text-slate-500">
                Track pharmaceutical returns in custody of MedLine Logistics
              </p>
            </div>
            <button
              onClick={() => handleInitiateReturn()}
              className="px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Return Request
            </button>
          </div>

          {returnRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No return requests logged for this pharmacy yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {returnRequests.map((req) => (
                <div
                  key={req.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50 hover:border-blue-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono font-bold text-sm text-[#0B1B3A]">
                      {req.batch_number}
                    </div>
                    <StatusBadge status={req.status as any} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Claimed Quantity</span>
                      <span className="font-bold text-slate-800">{req.qty_claimed} units</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Distributor</span>
                      <span className="font-bold text-slate-800">
                        {req.distributor?.name || 'MedLine Logistics'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[11px]">Condition</span>
                      <span className="text-slate-600 font-medium">{req.condition}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Logged: {formatDate(req.created_at)}</span>
                    <Link
                      href={`/batch/${req.batch_number}`}
                      className="text-[#1769E0] font-semibold hover:underline flex items-center gap-1"
                    >
                      Audit 360° <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 3: SALES / DISPENSE POS VERIFICATION                               */}
      {/* ========================================================================= */}
      {activeTab === 'dispense' && (
        <div className="space-y-4">
          <SaleSimulator />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6B. TAB: QR VERIFICATION                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <QrVerificationConsole roleTitle="Retailer Pharmacy" />
        </div>
      )}


      {/* ========================================================================= */}
      {/* 9. RETURN INITIATION MODAL                                                */}
      {/* ========================================================================= */}
      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedBatchForReturn(null);
        }}
        onSuccess={fetchRetailerData}
        preselectedBatch={selectedBatchForReturn}
      />

      {/* Case Dossier Modal */}
      {selectedCase && (
        <CaseDossierModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onStatusUpdated={(updated) => {
            setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCase(updated);
            fetchRetailerData();
          }}
        />
      )}
    </div>
  );
}
