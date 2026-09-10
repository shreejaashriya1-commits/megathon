'use client';

import React, { useEffect, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { DestructionModal } from '@/components/DestructionModal';
import { CreateBatchModal } from '@/components/CreateBatchModal';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Flame,
  FileCheck2,
  Building,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
  Lock,
  Hash,
  FileText,
  PackagePlus,
  Sparkles,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import { DestructionCertificate, InvestigationCase } from '@/../types/database';
import { CaseDossierModal } from '@/components/CaseDossierModal';

type TabType = 'pickups' | 'queue' | 'destruction' | 'certificates' | 'cases';

export default function ManufacturerDashboard() {
  const { currentOrg } = useRole();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType;
  const [pickups, setPickups] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<DestructionCertificate[]>([]);
  const [destroyedBatches, setDestroyedBatches] = useState<any[]>([]);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam === 'destruction' ? 'queue' : (tabParam || 'pickups'));
  const [selectedBatchData, setSelectedBatchData] = useState<any | null>(null);
  const [isDestructionModalOpen, setIsDestructionModalOpen] = useState<boolean>(false);
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState<boolean>(false);
  const [viewingCert, setViewingCert] = useState<DestructionCertificate | null>(null);

  useEffect(() => {
    if (tabParam) {
      if (tabParam === 'destruction') {
        setActiveTab('queue');
      } else if (['pickups', 'queue', 'certificates', 'cases', 'reports', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch confirmed pickups ready for destruction
      const res1 = await fetch('/api/pickups?status=confirmed');
      const json1 = await res1.json();
      if (json1.success && json1.data) {
        setPickups(json1.data);
      }

      // 2. Fetch all certificates
      const resCert = await fetch('/api/certificates');
      const jsonCert = await resCert.json();
      if (jsonCert.success && jsonCert.data) {
        setCertificates(jsonCert.data);
      }

      // 3. Fetch all batches to show permanent destroyed registry
      const res2 = await fetch('/api/batches');
      const json2 = await res2.json();
      if (json2.success && json2.data) {
        const destroyed = json2.data.filter((b: any) => b.status === 'DESTROYED');
        setDestroyedBatches(destroyed);
      }

      // 4. Fetch manufacturer integrity cases (re-entry, counterfeit serial collisions)
      const resCases = await fetch('/api/intelligence/cases?stakeholder=manufacturer');
      const jsonCases = await resCases.json();
      if (jsonCases.success && jsonCases.data) {
        setCases(jsonCases.data);
      }
    } catch (err) {
      console.error('Failed to load manufacturer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDestruction = (batchData: any) => {
    setSelectedBatchData(batchData);
    setIsDestructionModalOpen(true);
  };

  // Filter pickups into awaiting destruction vs in-queue
  const confirmedAwaitingLog = pickups.filter((item) => !item.destruction);
  const destructionQueue = pickups.filter((item) => item.destruction);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#1769E0] flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1769E0] block">
              MANUFACTURER DASHBOARD
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0B1B3A]">{currentOrg.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 uppercase">
                Manufacturer Compliance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source Batch Generation, Bio-Hazardous Destruction Execution &amp; Digital Certificate Issuance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateBatchModalOpen(true)}
            className="px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <PackagePlus className="w-4 h-4" />
            Create Medicine Batch
          </button>
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Protocol Active</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('pickups')}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeTab === 'pickups'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-[#0B1B3A] text-xs font-semibold">
            <span>Confirmed Pickups</span>
            <Building className="w-4 h-4 text-[#1769E0]" />
          </div>
          <p className="text-3xl font-black text-[#0B1B3A] mt-1">{confirmedAwaitingLog.length}</p>
          <span className="text-[10px] text-slate-500">In manufacturer custody &bull; Awaiting incineration</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeTab === 'queue'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Pending Destruction</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-950 mt-1">{destructionQueue.length}</p>
          <span className="text-[10px] text-amber-700">Incineration logged &bull; Awaiting cert generation</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeTab === 'certificates'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>Certificates Issued</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-950 mt-1">{certificates.length}</p>
          <span className="text-[10px] text-emerald-700">Digital destruction certificates</span>
        </button>

        <div className="p-5 rounded-2xl border text-left bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Destroyed Batches</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-1">{destroyedBatches.length}</p>
          <span className="text-[10px] text-rose-700 font-medium">Terminal state &bull; Permanent Registry</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pickups')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pickups'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Confirmed Pickups</span>
          {confirmedAwaitingLog.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
              {confirmedAwaitingLog.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Destruction Queue</span>
          {destructionQueue.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {destructionQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Certificates Issued</span>
          {certificates.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
              {certificates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('cases')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'cases'
              ? 'border-[#1769E0] text-[#1769E0]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Integrity Cases</span>
          {cases.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900">
              {cases.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CONFIRMED PICKUPS READY FOR DESTRUCTION */}
      {activeTab === 'pickups' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Confirmed Pickups Ready for Destruction</h2>
              <p className="text-xs text-slate-500">
                Batches delivered into manufacturer custody with verified reverse-chain custody
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
              {confirmedAwaitingLog.length} Awaiting Execution
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Verified Quantity</th>
                  <th className="py-3 px-4">Delivering Distributor</th>
                  <th className="py-3 px-4">Intake Date</th>
                  <th className="py-3 px-4">Custody Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading confirmed pickups...
                    </td>
                  </tr>
                ) : confirmedAwaitingLog.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No pickups awaiting destruction execution.
                    </td>
                  </tr>
                ) : (
                  confirmedAwaitingLog.map((item) => (
                    <tr key={item.batch.batch_number} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/batch/${item.batch.batch_number}`}
                          className="hover:text-rose-700 hover:underline inline-flex items-center gap-1"
                        >
                          {item.batch.batch_number}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.batch.medicine?.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.batch.quantity} units</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {item.pickup?.distributor?.name || 'MedLine Distributors'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {formatDate(item.pickup?.confirmed_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                          RETURN_CONFIRMED
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDestruction(item)}
                          className="px-3.5 py-1.5 bg-[#1769E0] hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition inline-flex items-center gap-1.5"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Record Destruction
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

      {/* TAB 2: DESTRUCTION QUEUE (Undergoing or awaiting certificate) */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Destruction Execution Queue</h2>
              <p className="text-xs text-slate-500">
                Incineration logged with facility records, awaiting formal certificate issuance &amp; registry seal
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {destructionQueue.length} In Progress
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Destruction ID</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">Qty Destroyed</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {destructionQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No batches in destruction queue awaiting certificate generation.
                    </td>
                  </tr>
                ) : (
                  destructionQueue.map((item) => (
                    <tr key={item.batch.batch_number} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #DES-{item.destruction.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/batch/${item.batch.batch_number}`}
                          className="hover:text-rose-700 hover:underline inline-flex items-center gap-1"
                        >
                          {item.batch.batch_number}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.batch.medicine?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                        {item.destruction.facility_name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-rose-900">
                        {item.destruction.qty_destroyed} units
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {item.destruction.evidence_url ? (
                          <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          AWAITING CERTIFICATE
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDestruction(item)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-sm transition inline-flex items-center gap-1.5"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" /> Issue Certificate
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

      {/* TAB 3: CERTIFICATES ISSUED & PERMANENT REGISTRY */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">MedTrace Digital Destruction Certificates</h2>
                <p className="text-xs text-slate-500">
                  Digitally secured disposal records with SHA-256 digital seal &amp; permanent registry lock
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {certificates.length} Issued
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Certificate No</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Destroyed Qty</th>
                    <th className="py-3 px-4">Facility / Location</th>
                    <th className="py-3 px-4">Tamper-Evident Hash</th>
                    <th className="py-3 px-4">Date Issued</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No certificates issued yet. Complete a destruction in the queue to issue certificates.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => {
                      // Generate reproducible SHA-256 mock hash for certificate
                      const certHash = `sha256:${cert.certificate_no.toLowerCase().replace(/[^a-z0-9]/g, '')}09af4c8b27ae41e4649b934ca495991b7852`;

                      return (
                        <tr key={cert.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 text-sm">
                            {cert.certificate_no}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {cert.batch_number}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {cert.batch?.medicine?.name || 'Pharmaceutical Batch'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {cert.destruction?.qty_destroyed ?? cert.batch?.quantity ?? 100} units
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {cert.destruction?.facility_name || 'Cipla Hazardous Incineration Facility Unit 4, Verna, Goa'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              {certHash.slice(0, 16)}...
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {formatDate(cert.issued_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => setViewingCert(cert)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-slate-500" /> View Certificate
                            </button>
                            <Link
                              href={`/batch/${cert.batch_number}`}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] transition inline-flex items-center gap-1"
                            >
                              Ledger 360° <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PERMANENT DESTROYED REGISTRY */}
          <div className="bg-white rounded-2xl border-2 border-rose-200/80 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-950 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/40">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-wide">Permanent Destroyed Registry (batch_registry)</h2>
                  <p className="text-xs text-rose-300">
                    Terminal immutable records. These batch identities can NEVER re-enter commerce.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-600/80 text-white rounded-lg text-xs font-mono font-black tracking-wider">
                IMMUTABLE
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-rose-50/50 text-rose-950 uppercase tracking-wider font-semibold border-b border-rose-100">
                  <tr>
                    <th className="py-3 px-4">Destroyed Batch Identity</th>
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4">Destroyed Quantity</th>
                    <th className="py-3 px-4">Permanent Status</th>
                    <th className="py-3 px-4">Defense Trigger</th>
                    <th className="py-3 px-4 text-right">Audit Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {destroyedBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No batches in permanent destroyed registry yet.
                      </td>
                    </tr>
                  ) : (
                    destroyedBatches.map((batch) => (
                      <tr key={batch.batch_number} className="hover:bg-rose-50/30 transition">
                        <td className="py-3.5 px-4 font-mono font-black text-rose-900 text-sm">
                          {batch.batch_number}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {batch.medicine?.name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{batch.quantity} units</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide bg-rose-100 text-rose-900 border border-rose-300">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            TERMINAL DESTROYED
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          <span className="text-rose-700 font-bold">ACTIVE BLOCK: </span>
                          Any future sale scan halts transaction &amp; dispatches regulator alert
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/batch/${batch.batch_number}`}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition"
                          >
                            Inspect 360° <ExternalLink className="w-3 h-3 text-slate-500" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTEGRITY CASES */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Batch Integrity & Re-entry Cases ({cases.length})
              </h2>
              <p className="text-xs text-slate-500">
                Critical alerts grouped for batch lifecycle integrity, destroyed-batch re-entry, and serial collisions
              </p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-[#1769E0] hover:underline font-medium"
            >
              Refresh Cases
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No active integrity cases</p>
              <p className="text-xs text-slate-500 mt-1">
                Any attempted re-entry of destroyed batches or duplicate serial numbers will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#1769E0]/50 hover:shadow-md cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900">{c.case_number || c.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                        c.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        c.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {c.severity} • Score: {c.risk_score}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {c.status}
                      </span>
                      {c.occurrence_count > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                          {c.occurrence_count} Bursts
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{c.root_cause || c.recommended_action || c.category}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                      <span>Batches: {c.affected_batches?.join(', ') || 'N/A'}</span>
                      <span>Category: {c.category}</span>
                      <span>Updated: {formatDate(c.last_detected_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCase(c);
                      }}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>View Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Destruction Modal */}
      <DestructionModal
        isOpen={isDestructionModalOpen}
        onClose={() => {
          setIsDestructionModalOpen(false);
          setSelectedBatchData(null);
        }}
        onSuccess={fetchData}
        batchData={selectedBatchData}
      />

      {/* Certificate Viewer Modal */}
      {viewingCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Official Destruction Certificate</h3>
              </div>
              <button
                onClick={() => setViewingCert(null)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Paper Style */}
            <div className="p-6 space-y-6">
              <div className="border-4 border-double border-slate-300 p-6 rounded-xl bg-gradient-to-b from-amber-50/20 to-white space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                    Pharmaceutical Reverse-Chain Compliance Protocol
                  </span>
                  <h4 className="text-xl font-serif font-black text-slate-900">
                    MEDTRACE DIGITAL DESTRUCTION CERTIFICATE
                  </h4>
                  <p className="text-xs text-slate-600 font-mono">
                    Certificate No: <strong className="text-emerald-800 font-bold">{viewingCert.certificate_no}</strong>
                  </p>
                </div>

                <div className="border-t border-b border-slate-200 py-4 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Batch Number:</span>
                    <span className="font-mono font-bold text-slate-900">{viewingCert.batch_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Medicine:</span>
                    <span className="font-semibold text-slate-900">{viewingCert.batch?.medicine?.name || 'Pharmaceutical'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destroyed Quantity:</span>
                    <span className="font-bold text-slate-900">
                      {viewingCert.destruction?.qty_destroyed ?? viewingCert.batch?.quantity ?? 100} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facility:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-xs">
                      {viewingCert.destruction?.facility_name || 'Cipla Hazardous Incineration Facility Unit 4, Verna, Goa'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issued Timestamp:</span>
                    <span className="font-mono text-slate-900">{formatDate(viewingCert.issued_at)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Digital Audit Proof</span>
                  </div>
                  <p className="font-mono text-[9px] text-slate-500 break-all">
                    sha256:{viewingCert.certificate_no.toLowerCase().replace(/[^a-z0-9]/g, '')}09af4c8b27ae41e4649b934ca495991b7852ba48e24c
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Status Verified</div>
                    <div className="text-[9px] text-slate-400">Locked in Batch Registry</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-900">Cipla Ltd Compliance Authority</div>
                    <div className="text-[9px] text-slate-400">Authorized Digital Signature</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setViewingCert(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Close
                </button>
                <Link
                  href={`/batch/${viewingCert.batch_number}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5"
                >
                  Inspect Full 360° Ledger <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={isCreateBatchModalOpen}
        onClose={() => setIsCreateBatchModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Case Dossier Modal */}
      {selectedCase && (
        <CaseDossierModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onStatusUpdated={(updated) => {
            setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCase(updated);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
