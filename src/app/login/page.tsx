'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import { Building2, Truck, Flame, AlertOctagon, ArrowRight, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Org } from '@/../types/database';

export default function LoginPage() {
  const { orgs, setOrgById, currentOrg } = useRole();
  const router = useRouter();

  // Group organizations by role
  const retailerOrgs = orgs.filter((o) => o.role === 'retailer');
  const distributorOrgs = orgs.filter((o) => o.role === 'distributor');
  const manufacturerOrgs = orgs.filter((o) => o.role === 'manufacturer');
  const regulatorOrgs = orgs.filter((o) => o.role === 'regulator');

  // Local selection states for dropdowns
  const [selectedRetailerId, setSelectedRetailerId] = useState<number>(
    currentOrg.role === 'retailer' ? currentOrg.id : retailerOrgs[0]?.id || 1
  );
  const [selectedDistributorId, setSelectedDistributorId] = useState<number>(
    currentOrg.role === 'distributor' ? currentOrg.id : distributorOrgs[0]?.id || 4
  );
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number>(
    currentOrg.role === 'manufacturer' ? currentOrg.id : manufacturerOrgs[0]?.id || 5
  );

  const handleEnterRole = (orgId: number, targetPath: string) => {
    setOrgById(orgId);
    router.push(targetPath);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Multi-Stakeholder Authentication • Reverse Supply Chain Gateway</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B3A] tracking-tight">
          Select Supply Chain Portal
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Authenticate as an authorized stakeholder to access the MedTrace pharmaceutical reverse chain compliance ledger.
        </p>
      </div>

      {/* 4 Stakeholder Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. RETAILER */}
        <div
          className={`p-6 rounded-2xl border-2 transition flex flex-col justify-between space-y-5 bg-white shadow-sm hover:shadow-md ${
            currentOrg.role === 'retailer'
              ? 'border-[#1769E0] ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-200">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0B1B3A]">1. RETAILER</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pharmacy shelf to return &bull; Reverse chain initiation
                  </p>
                </div>
              </div>
              {currentOrg.role === 'retailer' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" /> Active
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Track retail inventory, verify batch compliance status, initiate reverse returns for expired stock, and execute point-of-sale dispense verification.
            </p>

            {/* Dropdown: Select your pharmacy */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Select your pharmacy:
              </label>
              <select
                id="retailer-org-select"
                value={selectedRetailerId}
                onChange={(e) => setSelectedRetailerId(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-900 font-semibold text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769E0] cursor-pointer"
              >
                {retailerOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} — {org.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            id="enter-retailer-btn"
            type="button"
            onClick={() => handleEnterRole(selectedRetailerId, '/retailer')}
            className="w-full py-2.5 px-4 bg-[#1769E0] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Enter Retail Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2. DISTRIBUTOR */}
        <div
          className={`p-6 rounded-2xl border-2 transition flex flex-col justify-between space-y-5 bg-white shadow-sm hover:shadow-md ${
            currentOrg.role === 'distributor'
              ? 'border-[#1769E0] ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-200">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0B1B3A]">2. DISTRIBUTOR</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Reverse logistics handoff &bull; Physical intake
                  </p>
                </div>
              </div>
              {currentOrg.role === 'distributor' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" /> Active
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Verify incoming shipments returned by pharmacies, count physical packages, flag quantity discrepancies into formal disputes, and confirm verified pickups.
            </p>

            {/* Dropdown: Select your distribution center */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Select your distribution center:
              </label>
              <select
                id="distributor-org-select"
                value={selectedDistributorId}
                onChange={(e) => setSelectedDistributorId(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-900 font-semibold text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769E0] cursor-pointer"
              >
                {distributorOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} — {org.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            id="enter-distributor-btn"
            type="button"
            onClick={() => handleEnterRole(selectedDistributorId, '/distributor')}
            className="w-full py-2.5 px-4 bg-[#1769E0] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Enter Distributor Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. MANUFACTURER */}
        <div
          className={`p-6 rounded-2xl border-2 transition flex flex-col justify-between space-y-5 bg-white shadow-sm hover:shadow-md ${
            currentOrg.role === 'manufacturer'
              ? 'border-[#1769E0] ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-200">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0B1B3A]">3. MANUFACTURER</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Owns destruction obligation &bull; Certificate issuance
                  </p>
                </div>
              </div>
              {currentOrg.role === 'manufacturer' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" /> Active
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Take custody of verified return shipments, execute bio-hazardous incineration, record photographic evidence, and issue official Certificates of Destruction.
            </p>

            {/* Dropdown: Select your company */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Select your company:
              </label>
              <select
                id="manufacturer-org-select"
                value={selectedManufacturerId}
                onChange={(e) => setSelectedManufacturerId(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-900 font-semibold text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769E0] cursor-pointer"
              >
                {manufacturerOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} — {org.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            id="enter-manufacturer-btn"
            type="button"
            onClick={() => handleEnterRole(selectedManufacturerId, '/manufacturer')}
            className="w-full py-2.5 px-4 bg-[#1769E0] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Enter Manufacturer Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. REGULATOR */}
        <div
          className={`p-6 rounded-2xl border-2 transition flex flex-col justify-between space-y-5 bg-white shadow-sm hover:shadow-md ${
            currentOrg.role === 'regulator'
              ? 'border-[#0B1B3A] ring-2 ring-slate-900/10'
              : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-100 text-[#0B1B3A] border border-slate-300">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0B1B3A]">4. REGULATOR</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Oversight and investigation &bull; Command center
                  </p>
                </div>
              </div>
              {currentOrg.role === 'regulator' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-700" /> Active
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time cross-chain surveillance command center. Receives automated alerts on blocked re-entry attempts and inspects complete Batch 360° audit trails.
            </p>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#1769E0]" />
                <span>State Drug Controller</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Full system-wide surveillance and regulatory inspection feed.
              </p>
            </div>
          </div>

          <button
            id="enter-regulator-btn"
            type="button"
            onClick={() => handleEnterRole(regulatorOrgs[0]?.id || 6, '/regulator')}
            className="w-full py-2.5 px-4 bg-[#0B1B3A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Access Regulatory Command</span>
            <ArrowRight className="w-4 h-4 text-blue-300" />
          </button>
        </div>
      </div>

      {/* Demonstration & Compliance Notice */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-600 max-w-xl mx-auto shadow-sm space-y-1">
        <p className="font-semibold text-slate-700">
          MedTrace Compliance Platform • Demonstration Prototype
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          All stakeholder profiles, batch numbers, inspection evidence, and certificates displayed are simulated demonstration data for evaluating pharmaceutical reverse-supply-chain workflows.
        </p>
      </div>
    </div>
  );
}
