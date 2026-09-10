'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Shield, Building2, ChevronDown, Activity, AlertOctagon, RefreshCw, ShoppingCart, Truck, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { currentOrg, currentRole, orgs, setOrgById } = useRole();
  const pathname = usePathname();

  const navLinks = [
    { href: '/retailer', label: 'Retailer Inventory', icon: Building2, role: 'retailer' },
    { href: '/retailer/dispense', label: 'Sell / Dispense Simulator', icon: ShoppingCart, role: 'retailer' },
    { href: '/distributor', label: 'Distributor Logistics', icon: Truck, role: 'distributor' },
    { href: '/manufacturer', label: 'Manufacturer Destruction', icon: Flame, role: 'manufacturer' },
    { href: '/regulator', label: 'Regulator Command Feed', icon: AlertOctagon, role: 'regulator' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner - Enterprise Context */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide text-white">MEDTRACE LEDGER</span>
          <span className="text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">Pharmaceutical Reverse Chain Compliance &amp; Re-entry Defense</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Role Status:</span>
          <span className="font-mono text-emerald-400 uppercase font-semibold text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
            {currentRole}
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center text-white shadow-md shadow-teal-900/10 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">MEDTRACE</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                    MVP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
                  Pharma Reverse Chain &amp; Re-entry Detection
                </p>
              </div>
            </Link>
          </div>

          {/* Role Switcher "Acting As" */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-300/80 rounded-xl p-1.5 shadow-sm">
              <span className="text-xs font-semibold text-slate-600 pl-2 hidden md:inline">
                Acting as:
              </span>
              <div className="relative">
                <select
                  value={currentOrg.id}
                  onChange={(e) => setOrgById(Number(e.target.value))}
                  className="appearance-none bg-white text-slate-900 font-semibold text-xs sm:text-sm pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                >
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.role.toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <Link
                href="/login"
                className="hidden lg:inline-flex items-center px-2 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-50 rounded-md transition"
                title="Open Persona Switcher Portal"
              >
                Switch
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 border-t border-slate-100 py-2 overflow-x-auto scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isPersonaMatch = link.role === currentRole;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/10'
                    : isPersonaMatch
                    ? 'text-teal-900 bg-teal-50 hover:bg-teal-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-teal-200' : 'text-slate-400')} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
