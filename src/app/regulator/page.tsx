'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRole } from '@/context/RoleContext';
import { Alert, Batch, ReturnRequest, AlertStatus, InvestigationCase, OrganizationRiskProfile } from '@/../types/database';
import { AlertCard } from '@/components/AlertCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CaseDossierModal } from '@/components/CaseDossierModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertOctagon,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Radio,
  RefreshCw,
  Search,
  Filter,
  FileWarning,
  ExternalLink,
  ArrowRight,
  Database,
  CheckCircle2,
  Package,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  FolderOpen,
  Sparkles,
  Bot,
  Activity,
  TrendingUp,
  Gauge,
  Layers,
  Send,
} from 'lucide-react';

type TabType = 'cases' | 'org_risk' | 'simulation' | 'alerts' | 'batches' | 'disputes' | 'lookup';

export default function RegulatorDashboard() {
  const { currentOrg } = useRole();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType;
  const caseIdParam = searchParams.get('caseId');

  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [orgRisks, setOrgRisks] = useState<OrganizationRiskProfile[]>([]);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [disputes, setDisputes] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ['cases', 'org_risk', 'simulation', 'alerts', 'batches', 'disputes', 'lookup'].includes(tabParam)
      ? tabParam
      : 'cases'
  );

  // Case filters
  const [caseFilterSeverity, setCaseFilterSeverity] = useState<string>('ALL');
  const [caseFilterStatus, setCaseFilterStatus] = useState<string>('ALL');
  const [caseSearchQuery, setCaseSearchQuery] = useState<string>('');

  // Raw alert filters
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterBatchStatus, setFilterBatchStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<Batch | null>(null);
  const [isSearchingLookup, setIsSearchingLookup] = useState<boolean>(false);
  const [lookupAttempted, setLookupAttempted] = useState<boolean>(false);

  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  useEffect(() => {
    if (tabParam && ['cases', 'org_risk', 'simulation', 'alerts', 'batches', 'disputes', 'lookup'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchAllData = async () => {
    try {
      // 1. Fetch Investigation Cases
      const resCases = await fetch('/api/intelligence/cases');
      const jsonCases = await resCases.json();
      if (jsonCases.success && jsonCases.data) {
        setCases(jsonCases.data);
      }

      // 2. Fetch Organization Risk Profiles
      const resOrgRisk = await fetch('/api/intelligence/org-risk');
      const jsonOrgRisk = await resOrgRisk.json();
      if (jsonOrgRisk.success && jsonOrgRisk.data) {
        setOrgRisks(jsonOrgRisk.data);
      }

      // 3. Fetch alerts
      const res1 = await fetch('/api/alerts');
      const json1 = await res1.json();
      if (json1.success && json1.data) {
        setAlerts(json1.data);
      }

      // 4. Fetch batches
      const res2 = await fetch('/api/batches');
      const json2 = await res2.json();
      if (json2.success && json2.data) {
        setBatches(json2.data);
      }

      // 5. Fetch disputes
      const res3 = await fetch('/api/disputes');
      const json3 = await res3.json();
      if (json3.success && json3.data) {
        setDisputes(json3.data);
      }
    } catch (err) {
      console.error('Failed to load regulator data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (caseIdParam && cases.length > 0) {
      const match = cases.find((c) => c.id === caseIdParam);
      if (match) {
        setSelectedCase(match);
        setActiveTab('cases');
      }
    }
  }, [caseIdParam, cases]);

  useEffect(() => {
    fetchAllData();

    // Setup Supabase Realtime channel if configured
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('regulator-alerts-feed')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'alerts' },
            () => {
              fetchAllData();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsRealtimeActive(true);
            }
          });
      } catch (err) {
        console.warn('Supabase realtime subscription failed, fallback to 3s polling:', err);
      }
    }

    // Spec Requirement 24: Resilient fallback polling every 3 seconds
    const pollingInterval = setInterval(() => {
      fetchAllData();
    }, 3000);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      clearInterval(pollingInterval);
    };
  }, []);

  // Intelligence & Case Metrics
  const criticalCases = cases.filter((c) => c.severity === 'CRITICAL');
  const highCases = cases.filter((c) => c.severity === 'HIGH');
  const activeCases = cases.filter(
    (c) => c.status === 'UNDER_INVESTIGATION' || c.status === 'ACTION_REQUIRED' || c.status === 'OPEN'
  );
  const avgChainRisk = orgRisks.length > 0
    ? Math.round(orgRisks.reduce((sum, r) => sum + (r.overall_risk_score ?? r.risk_score ?? 0), 0) / orgRisks.length)
    : 0;

  const filteredCases = cases.filter((c) => {
    const matchesSeverity = caseFilterSeverity === 'ALL' || c.severity === caseFilterSeverity;
    const matchesStatus = caseFilterStatus === 'ALL' || c.status === caseFilterStatus;
    const matchesQuery =
      caseSearchQuery === '' ||
      c.id.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
      (c.primary_org?.name || '').toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
      c.affected_batches.some((b) => b.toLowerCase().includes(caseSearchQuery.toLowerCase()));
    return matchesSeverity && matchesStatus && matchesQuery;
  });

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/intelligence/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1000 }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSimulationResult(json.data);
        await fetchAllData();
      }
    } catch (e) {
      console.error('Simulation failed:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Raw alerts & batches metrics
  const openAlerts = alerts.filter((a) => a.status === 'open');
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');
  const destroyedBatches = batches.filter((b) => b.status === 'DESTROYED');

  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const matchesStatus = filterStatus === 'ALL' || (a.status || 'open') === filterStatus;
    return matchesSeverity && matchesStatus;
  });

  const filteredBatches = batches.filter((b) => {
    const matchesStatus = filterBatchStatus === 'ALL' || b.status === filterBatchStatus;
    const matchesQuery =
      searchQuery === '' ||
      b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.medicine?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.current_holder?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  // Handle direct batch lookup
  const handleLookupSubmit = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();
    const query = (customTarget !== undefined ? customTarget : lookupQuery).trim().toUpperCase();
    if (!query) return;

    setIsSearchingLookup(true);
    setLookupAttempted(true);

    // First check in-memory batches
    const localMatch = batches.find(
      (b) => b.batch_number.toUpperCase() === query || (b.qr_token && b.qr_token.toUpperCase() === query)
    );

    if (localMatch) {
      setLookupResult(localMatch);
      setIsSearchingLookup(false);
      return;
    }

    // Otherwise fetch from server API
    try {
      const res = await fetch(`/api/batches/${encodeURIComponent(query)}/timeline`);
      const json = await res.json();
      if (json.success && json.data?.batch) {
        setLookupResult(json.data.batch);
      } else {
        setLookupResult(null);
      }
    } catch (err) {
      console.warn('Lookup search failed:', err);
      setLookupResult(null);
    } finally {
      setIsSearchingLookup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B1B3A] text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
              REGULATORY COMMAND DASHBOARD
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{currentOrg.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                Regulatory Oversight
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Pharmaceutical Surveillance, Reverse Chain Oversight &amp; Re-entry Defense
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="text-emerald-400 font-bold truncate">
              {isRealtimeActive ? 'REALTIME LIVE' : 'NEAR-REAL-TIME POLLING (3s)'}
            </span>
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition shrink-0"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Command Center Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('cases');
            setCaseFilterSeverity('CRITICAL');
            setCaseFilterStatus('ALL');
          }}
          className={`p-5 rounded-2xl border text-left transition shadow-xs ${
            activeTab === 'cases' && caseFilterSeverity === 'CRITICAL'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-rose-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
            <span>Critical Cases</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-rose-950 mt-1">{criticalCases.length}</p>
          <span className="text-[11px] text-rose-700">Immediate safety intervention</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('cases');
            setCaseFilterSeverity('HIGH');
            setCaseFilterStatus('ALL');
          }}
          className={`p-5 rounded-2xl border text-left transition shadow-xs ${
            activeTab === 'cases' && caseFilterSeverity === 'HIGH'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-amber-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>High-Risk Cases</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-950 mt-1">{highCases.length}</p>
          <span className="text-[11px] text-amber-700">Severe compliance escalation</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('cases');
            setCaseFilterStatus('UNDER_INVESTIGATION');
            setCaseFilterSeverity('ALL');
          }}
          className={`p-5 rounded-2xl border text-left transition shadow-xs ${
            activeTab === 'cases' && caseFilterStatus === 'UNDER_INVESTIGATION'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Under Active Investigation</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-1">{activeCases.length}</p>
          <span className="text-[11px] text-slate-500">Cases pending resolution</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('org_risk')}
          className={`p-5 rounded-2xl border text-left transition shadow-xs ${
            activeTab === 'org_risk'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between text-purple-800 text-xs font-semibold">
            <span>Chain Risk Index</span>
            <Gauge className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-1">{avgChainRisk} <span className="text-sm font-semibold text-slate-500">/ 100</span></p>
          <span className="text-[11px] text-slate-500">
            {avgChainRisk > 50 ? 'Elevated Risk Posture' : 'Compliant Network State'}
          </span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('cases')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'cases'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-rose-600" />
          <span>Investigation Cases</span>
          {cases.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900">
              {cases.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('org_risk')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'org_risk'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-600" />
          <span>Org Risk Leaderboard</span>
          {orgRisks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
              {orgRisks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'simulation'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>1,000+ Event Simulation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-slate-500" />
          <span>Raw Alert Stream</span>
          {alerts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {alerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'batches'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-[#1769E0]" />
          <span>All Batches</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900">
            {batches.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('disputes')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'disputes'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileWarning className="w-4 h-4 text-orange-600" />
          <span>All Disputes</span>
          {disputes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900">
              {disputes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lookup')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'lookup'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-slate-600" />
          <span>Batch Lookup</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: INVESTIGATION CASES (PRIMARY INTELLIGENCE QUEUE)                  */}
      {/* ======================================================================= */}
      {activeTab === 'cases' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-[#0B1B3A]">
                  Prioritized Investigation Cases
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Grouped incidents, deduplicated bursts, multi-factor risk scores &amp; AI anomaly indicators
              </p>
            </div>

            {/* Filter Controls: Severity, Status & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter cases..."
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1769E0]"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCaseFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({cases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCaseFilterStatus('OPEN')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterStatus === 'OPEN' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setCaseFilterStatus('UNDER_INVESTIGATION')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterStatus === 'UNDER_INVESTIGATION' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  Investigating
                </button>
                <button
                  type="button"
                  onClick={() => setCaseFilterStatus('RESOLVED')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterStatus === 'RESOLVED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Resolved
                </button>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCaseFilterSeverity('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterSeverity === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCaseFilterSeverity('CRITICAL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterSeverity === 'CRITICAL' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Critical ({criticalCases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCaseFilterSeverity('HIGH')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    caseFilterSeverity === 'HIGH' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  High ({highCases.length})
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Synchronizing investigation case ledger...
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">No Cases Matching Selected Criteria</p>
                <p className="text-slate-400 text-[11px]">
                  All active cases are currently filtered or supply chain compliance is verified.
                </p>
              </div>
            ) : (
              filteredCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className={`p-5 rounded-2xl border transition-all duration-150 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    caseItem.severity === 'CRITICAL'
                      ? 'border-l-4 border-l-rose-600 bg-rose-50/20 border-slate-200'
                      : caseItem.severity === 'HIGH'
                      ? 'border-l-4 border-l-amber-500 bg-amber-50/20 border-slate-200'
                      : 'border-l-4 border-l-blue-500 bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {caseItem.id}
                      </span>
                      {caseItem.severity === 'CRITICAL' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 animate-pulse" />
                          CRITICAL
                        </span>
                      )}
                      {caseItem.severity === 'HIGH' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          HIGH
                        </span>
                      )}
                      {caseItem.severity !== 'CRITICAL' && caseItem.severity !== 'HIGH' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {caseItem.severity}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                        {caseItem.status}
                      </span>
                      {caseItem.occurrence_count > 1 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          ⚡ {caseItem.occurrence_count} Occurrences (Burst Suppressed)
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {caseItem.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {caseItem.root_cause || 'Evaluated under pharmaceutical supply chain compliance matrix.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {caseItem.primary_org?.name || `Org #${caseItem.primary_org_id}`}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {caseItem.affected_batches.join(', ')}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px]">
                        Last activity: {formatDate(caseItem.last_detected_at)}
                      </span>
                    </div>

                    {caseItem.anomaly_factors && caseItem.anomaly_factors.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {caseItem.anomaly_factors.map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-100 text-violet-800 border border-violet-200"
                          >
                            <Bot className="w-2.5 h-2.5" />
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Risk Score & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-2xl font-black text-slate-900">{caseItem.risk_score}</span>
                        <span className="text-xs font-semibold text-slate-400">/100</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Priority Score
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCase(caseItem)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1769E0] hover:bg-blue-700 text-white transition shadow-xs flex items-center gap-1.5"
                    >
                      <span>Investigate Case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: ORGANIZATION RISK LEADERBOARD                                    */}
      {/* ======================================================================= */}
      {activeTab === 'org_risk' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-[#0B1B3A]">
                  Supply Chain Participant Risk Index
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic risk profiling based on historical incidents, repeat offenses, and open investigations
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500">Evaluation Mode:</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                AUTOMATED PROFILING ACTIVE
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgRisks.map((profile) => (
                <div
                  key={profile.org_id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{profile.org_name}</h3>
                      <span className="text-[11px] text-slate-500 font-medium capitalize">
                        Role: {profile.role}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                        profile.risk_tier === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : profile.risk_tier === 'HIGH'
                          ? 'bg-amber-500 text-white'
                          : profile.risk_tier === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {profile.risk_tier} RISK
                    </span>
                  </div>

                  {/* Risk Score Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Compliance Risk Score:</span>
                      <span className="font-bold text-slate-900">
                        {profile.overall_risk_score ?? profile.risk_score ?? 0} / 100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (profile.overall_risk_score ?? profile.risk_score ?? 0) >= 70
                            ? 'bg-rose-600'
                            : (profile.overall_risk_score ?? profile.risk_score ?? 0) >= 45
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, profile.overall_risk_score ?? profile.risk_score ?? 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Violations Summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Unresolved Cases</span>
                      <span className="text-sm font-black text-slate-800">{profile.unresolved_cases_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Critical Breaches</span>
                      <span className="text-sm font-black text-rose-700">{profile.critical_cases_count}</span>
                    </div>
                  </div>

                  {/* Risk Signals */}
                  {profile.risk_signals && profile.risk_signals.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Identified Drivers:</span>
                      {profile.risk_signals.slice(0, 2).map((sig, i) => (
                        <p key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">{sig}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Recommended Action */}
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
                    <span className="font-bold text-slate-900">Recommended Action: </span>
                    {profile.recommended_action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: 1,000+ EVENT SIMULATION FUNNEL                                   */}
      {/* ======================================================================= */}
      {activeTab === 'simulation' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
          <div className="p-6 bg-gradient-to-r from-slate-900 via-[#0B1B3A] to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold">1,000+ Event Supply Chain Intelligence Simulator</h2>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Demonstrates how MedTrace prevents alert fatigue: 1,000 transactions are evaluated through the Priority Engine, Isolation Forest Anomaly Detector, Case Grouper, and Stakeholder Router.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing 1,000 Events...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute 1,000+ Simulation</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 space-y-6">
            {simulationResult ? (
              <div className="space-y-6">
                {/* Result Message */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm mb-0.5">Simulation Pipeline Finished</h4>
                    <p className="leading-relaxed">{simulationResult.summaryMessage}</p>
                  </div>
                </div>

                {/* Visual Intelligence Funnel Diagram */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                    Alert Fatigue Reduction &amp; Case Intelligence Funnel
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">1. Raw Stream</span>
                      <p className="text-2xl font-black text-slate-900">{simulationResult.totalRawEvents}</p>
                      <span className="text-[10px] text-slate-400 block">Total Simulated Events</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">2. Normal Filtered</span>
                      <p className="text-2xl font-black text-emerald-600">{simulationResult.normalEventsCount}</p>
                      <span className="text-[10px] text-slate-400 block">0 Alerts, 0 Spam</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">3. Deduplicated Spam</span>
                      <p className="text-2xl font-black text-amber-600">{simulationResult.duplicateAlertsSuppressedCount}</p>
                      <span className="text-[10px] text-slate-400 block">Collapsed into Cases</span>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-1">
                      <span className="text-[11px] font-bold text-rose-700">4. Regulator Actionable</span>
                      <p className="text-2xl font-black text-rose-700">{simulationResult.regulatorActionableCasesCount}</p>
                      <span className="text-[10px] text-rose-600 block">Critical &amp; High Only</span>
                    </div>
                  </div>
                </div>

                {/* Notifications Routed by Stakeholder Role */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                    Actionable Notifications Routed by Stakeholder
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Retailers</span>
                      <span className="text-xl font-bold text-slate-900">{simulationResult.notificationsByRole.retailer}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Expiry / Local alerts</span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Distributors</span>
                      <span className="text-xl font-bold text-slate-900">{simulationResult.notificationsByRole.distributor}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Pickup discrepancies</span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Manufacturers</span>
                      <span className="text-xl font-bold text-slate-900">{simulationResult.notificationsByRole.manufacturer}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Clones &amp; Destruction</span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40">
                      <span className="text-[11px] text-rose-800 font-bold block">Regulator</span>
                      <span className="text-xl font-bold text-rose-950">{simulationResult.notificationsByRole.regulator}</span>
                      <span className="text-[10px] text-rose-600 block mt-0.5">Strict safety escalations</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cases')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1769E0] hover:bg-blue-700 text-white transition shadow-sm inline-flex items-center gap-2"
                  >
                    <span>View Prioritized Investigation Cases</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs space-y-3 max-w-lg mx-auto">
                <Sparkles className="w-10 h-10 text-amber-500 mx-auto opacity-70" />
                <h4 className="font-bold text-slate-800 text-sm">Simulation Engine Ready</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Click the button above to generate 1,000+ synthetic transactions across normal sales, minor count discrepancies, repeat pickup disputes, expired stock attempts, and destroyed batch re-entry bursts.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 1: LIVE ALERTS FEED                                                 */}
      {/* ======================================================================= */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
              <h2 className="text-base font-bold text-[#0B1B3A]">Live Surveillance &amp; Fraud Alert Feed</h2>
            </div>

            {/* Filter Controls: Severity & Status */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Status
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('open')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterStatus === 'open' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Open ({openAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('investigating')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterStatus === 'investigating' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  Investigating
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('resolved')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterStatus === 'resolved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Resolved
                </button>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterSeverity('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterSeverity === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Severities
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSeverity('CRITICAL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterSeverity === 'CRITICAL' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Critical ({criticalAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSeverity('HIGH')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterSeverity === 'HIGH' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-red-700'
                  }`}
                >
                  High
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Connecting to live alert stream...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">No Incidents Matching Selected Filters</p>
                <p className="text-slate-400 text-[11px]">All reverse chain movements are conforming to protocol.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onUpdate={fetchAllData} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: NATIONAL PHARMACEUTICAL LEDGER (ALL BATCHES)                     */}
      {/* ======================================================================= */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0B1B3A]">Pharmaceutical Batch Registry</h2>
              <p className="text-xs text-slate-500">
                Audited custody across all lifecycle states: ACTIVE • RETURN_INITIATED • RETURN_CONFIRMED • DISPUTED • DESTROYED
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterBatchStatus}
                onChange={(e) => setFilterBatchStatus(e.target.value)}
                className="bg-slate-50 text-slate-800 font-semibold text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769E0]"
              >
                <option value="ALL">All Lifecycle Statuses ({batches.length})</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="RETURN_INITIATED">RETURN_INITIATED</option>
                <option value="RETURN_CONFIRMED">RETURN_CONFIRMED</option>
                <option value="DISPUTED">DISPUTED</option>
                <option value="DESTROYED">DESTROYED</option>
              </select>
            </div>
          </div>

          <div className="px-5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch number, medicine name, or holder pharmacy..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769E0]"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Current Holder</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No batches match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr key={batch.batch_number} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B1B3A]">
                        {batch.batch_number}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {batch.medicine?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {batch.current_holder?.name || 'Central Custody'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{batch.quantity} units</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {formatDate(batch.expiry_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/batch/${encodeURIComponent(batch.batch_number)}`}
                          className="px-3 py-1.5 bg-[#1769E0]/10 hover:bg-[#1769E0] text-[#1769E0] hover:text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs"
                        >
                          Inspect 360° <ExternalLink className="w-3 h-3" />
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

      {/* ======================================================================= */}
      {/* TAB 3: CUSTODY DISPUTES REGISTRY                                        */}
      {/* ======================================================================= */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl text-xs text-orange-950 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-orange-900">
              <FileWarning className="w-5 h-5 text-orange-600" />
              <span>Physical Intake Discrepancy Registry</span>
            </div>
            <p className="text-orange-800">
              All flagged discrepancies between pharmacy return claims and distributor physical intake counts across the territory.
            </p>
          </div>

          {disputes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">Zero Active Logistics Disputes</p>
              <p className="text-xs text-slate-500">
                All reverse-chain shipments have matched verified quantities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disputes.map((item) => {
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
                          Dispute Audit #RET-{item.id}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {item.batch?.medicine?.name || 'Medicine'}
                        </h3>
                        <p className="text-xs font-mono text-slate-500">Batch: {item.batch_number}</p>
                      </div>
                      <Link
                        href={`/batch/${encodeURIComponent(item.batch_number)}`}
                        className="text-xs text-[#1769E0] font-bold hover:underline flex items-center gap-1"
                      >
                        Ledger 360° <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Claimed</span>
                        <p className="text-lg font-bold text-slate-900">{claimed}</p>
                        <span className="text-[9px] text-slate-400">Pharmacy</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-orange-700 uppercase">Received</span>
                        <p className="text-lg font-bold text-orange-950">{received}</p>
                        <span className="text-[9px] text-orange-600">Physical Count</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-rose-700 uppercase">Difference</span>
                        <p className="text-lg font-bold text-rose-900">
                          {diff > 0 ? `+${diff}` : diff}
                        </p>
                        <span className="text-[9px] text-rose-600">Discrepancy</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-slate-400">Reporting Pharmacy:</span>{' '}
                        <span className="font-semibold text-slate-800">{item.retailer?.name || 'Retailer'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Intake Distributor:</span>{' '}
                        <span className="font-semibold text-slate-800">{item.pickup?.distributor?.name || 'MedLine Distributors'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Status:</span>{' '}
                        <span className="font-bold text-orange-700 uppercase">{item.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: REGULATORY BATCH LOOKUP & FORENSICS                               */}
      {/* ======================================================================= */}
      {activeTab === 'lookup' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0B1B3A]">Regulatory Batch Lookup &amp; Forensics</h2>
            <p className="text-xs text-slate-500">
              Query any pharmaceutical batch identity or QR token to instantly verify chain of custody and destruction records.
            </p>
          </div>

          <form onSubmit={(e) => handleLookupSubmit(e)} className="max-w-xl space-y-3">
            <label className="text-xs font-bold text-slate-700">Enter Batch Number or QR Identifier</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="e.g. PCM2026A01 or AMX-DEMO-001"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769E0] uppercase"
              />
              <button
                type="submit"
                disabled={isSearchingLookup || !lookupQuery.trim()}
                className="px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                {isSearchingLookup ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Lookup Batch</span>
              </button>

              <Link
                href={`/batch/${encodeURIComponent(lookupQuery.trim() || 'PCM2026A01')}`}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                <span>Investigate 360° Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Inspect Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
              <span className="font-semibold">Quick test:</span>
              <button
                type="button"
                onClick={() => {
                  setLookupQuery('PCM2026A01');
                  handleLookupSubmit(undefined, 'PCM2026A01');
                }}
                className="font-mono text-[#1769E0] hover:underline font-bold bg-blue-50 px-2 py-0.5 rounded"
              >
                PCM2026A01
              </button>
              <button
                type="button"
                onClick={() => {
                  setLookupQuery('AMX-DEMO-001');
                  handleLookupSubmit(undefined, 'AMX-DEMO-001');
                }}
                className="font-mono text-rose-700 hover:underline font-bold bg-rose-50 px-2 py-0.5 rounded"
              >
                AMX-DEMO-001 (Destroyed)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLookupQuery('AZI-2026-088');
                  handleLookupSubmit(undefined, 'AZI-2026-088');
                }}
                className="font-mono text-slate-700 hover:underline font-bold bg-slate-100 px-2 py-0.5 rounded"
              >
                AZI-2026-088
              </button>
            </div>
          </form>

          {/* Lookup Result View */}
          {lookupAttempted && (
            <div className="pt-4 border-t border-slate-100">
              {lookupResult ? (
                <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 space-y-4 max-w-2xl animate-in fade-in duration-150">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                        Lookup Match Verified
                      </span>
                      <h3 className="text-xl font-mono font-black text-slate-900 mt-0.5">
                        {lookupResult.batch_number}
                      </h3>
                      <p className="text-xs font-semibold text-slate-700">
                        {lookupResult.medicine?.name || 'Pharmaceutical Formulation'}
                      </p>
                    </div>
                    <StatusBadge status={lookupResult.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block font-semibold">Current Custody Holder:</span>
                      <p className="font-bold text-slate-800 mt-0.5 truncate">
                        {lookupResult.current_holder?.name || 'In Transit'}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block font-semibold">Stock Quantity:</span>
                      <p className="font-bold text-slate-800 mt-0.5">{lookupResult.quantity} units</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block font-semibold">Expiry Date:</span>
                      <p className="font-mono text-slate-800 mt-0.5">{formatDate(lookupResult.expiry_date)}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/80">
                    <span className="text-xs text-slate-600 font-medium">
                      {lookupResult.status === 'DESTROYED'
                        ? 'Identified as permanently destroyed in immutable batch_registry.'
                        : 'Active pharmaceutical batch within compliant reverse chain.'}
                    </span>
                    <Link
                      href={`/batch/${encodeURIComponent(lookupResult.batch_number)}`}
                      className="px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                    >
                      Investigate 360° Ledger <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-1 max-w-xl">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    No batch records found matching &quot;{lookupQuery}&quot;
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Please double-check the batch number or QR token identifier.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Case Dossier 360 Deep Dive Modal */}
      {selectedCase && (
        <CaseDossierModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onStatusUpdated={(updated) => {
            setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCase(updated);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}
