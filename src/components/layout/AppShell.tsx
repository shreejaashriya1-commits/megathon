'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  Shield,
  LayoutDashboard,
  Package,
  RotateCcw,
  QrCode,
  ShoppingCart,
  Clock,
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  ShieldAlert,
  Database,
  AlertOctagon,
  Search,
  Building2,
  ChevronDown,
  Menu,
  X,
  PackageCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentRole, currentOrg } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [pendingReturnsCount, setPendingReturnsCount] = useState<number>(0);

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, searchParams]);

  // Query live pending returns badge count
  useEffect(() => {
    const fetchBadgeCount = async () => {
      try {
        const res = await fetch('/api/returns');
        const json = await res.json();
        if (json.success && json.data) {
          const count = json.data.filter((r: any) => r.status === 'pending').length;
          setPendingReturnsCount(count);
        }
      } catch {
        // silent fallback
      }
    };
    fetchBadgeCount();
  }, [pathname]);

  // If on login page, render clean full-width canvas
  if (pathname === '/login') {
    return <div className="min-h-screen bg-[#F7F9FC]">{children}</div>;
  }

  // Streamlined role navigation - purely operational views without extraneous clutter
  const getNavItems = () => {
    switch (currentRole) {
      case 'retailer':
        return [
          { label: 'Dashboard', href: '/retailer', tab: 'dashboard', icon: LayoutDashboard },
          { label: 'Inventory', href: '/retailer?tab=inventory', tab: 'inventory', icon: Package },
          {
            label: 'Returns',
            href: '/retailer?tab=returns',
            tab: 'returns',
            icon: RotateCcw,
            badge: pendingReturnsCount > 0 ? String(pendingReturnsCount) : undefined,
          },
          { label: 'QR Verification', href: '/retailer?tab=qr', tab: 'qr', icon: QrCode },
          { label: 'Sales / Dispense', href: '/retailer/dispense', tab: 'dispense', icon: ShoppingCart },
          { label: 'Batch 360°', href: '/batch/PCM2026A01', tab: 'batch360', icon: Clock },
        ];
      case 'distributor':
        return [
          { label: 'Dashboard', href: '/distributor', tab: 'dashboard', icon: LayoutDashboard },
          {
            label: 'Incoming Returns',
            href: '/distributor?tab=incoming',
            tab: 'incoming',
            icon: ArrowDownToLine,
            badge: pendingReturnsCount > 0 ? String(pendingReturnsCount) : undefined,
          },
          { label: 'Confirmed Pickups', href: '/distributor?tab=confirmed', tab: 'confirmed', icon: CheckCircle2 },
          { label: 'Disputes', href: '/distributor?tab=disputes', tab: 'disputes', icon: AlertTriangle },
          { label: 'QR Verification', href: '/distributor?tab=qr', tab: 'qr', icon: QrCode },
          { label: 'Batch 360°', href: '/batch/PCM2026A01', tab: 'batch360', icon: Clock },
        ];
      case 'manufacturer':
        return [
          { label: 'Dashboard', href: '/manufacturer', tab: 'dashboard', icon: LayoutDashboard },
          { label: 'Confirmed Pickups', href: '/manufacturer?tab=pickups', tab: 'pickups', icon: PackageCheck },
          { label: 'Destruction Queue', href: '/manufacturer?tab=destruction', tab: 'destruction', icon: Flame },
          { label: 'Certificates', href: '/manufacturer?tab=certificates', tab: 'certificates', icon: Award },
          { label: 'Batch 360°', href: '/batch/PCM2026A01', tab: 'batch360', icon: Clock },
        ];
      case 'regulator':
      default:
        return [
          { label: 'Dashboard', href: '/regulator', tab: 'dashboard', icon: LayoutDashboard },
          { label: 'Live Alerts', href: '/regulator?tab=alerts', tab: 'alerts', icon: ShieldAlert },
          { label: 'All Batches', href: '/regulator?tab=batches', tab: 'batches', icon: Database },
          { label: 'All Disputes', href: '/regulator?tab=disputes', tab: 'disputes', icon: AlertOctagon },
          { label: 'Batch Lookup', href: '/regulator?tab=lookup', tab: 'lookup', icon: Search },
          { label: 'Batch 360°', href: '/batch/PCM2026A01', tab: 'batch360', icon: Clock },
        ];
    }
  };

  const navItems = getNavItems();
  const currentTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="min-h-screen flex bg-[#F7F9FC] text-[#0B1B3A]">
      {/* ========================================================================= */}
      {/* 1. DESKTOP LEFT SIDEBAR (Dark Navy #0B1B3A)                               */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex w-64 bg-[#0B1B3A] text-white flex-col shrink-0 min-h-screen border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <Link href={`/${currentRole}`} className="flex items-start gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1769E0] flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white leading-none">
                  MedTrace
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight font-medium">
                Pharmaceutical Reverse Chain
                <br />
                Compliance &amp; Re-entry Detection
              </p>
            </div>
          </Link>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Route & Tab matching
            const isExactPath = pathname === item.href;
            const isTabMatch =
              pathname === `/${currentRole}` &&
              (currentTab === item.tab || (item.tab === 'dashboard' && !searchParams.get('tab')));
            const isDispenseMatch =
              item.tab === 'dispense' && (pathname === '/sales' || pathname.includes('/dispense'));
            const isBatch360Match = item.tab === 'batch360' && pathname.startsWith('/batch/');

            const isActive = isExactPath || isTabMatch || isDispenseMatch || isBatch360Match;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                  isActive
                    ? 'bg-[#1769E0] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full text-[10.5px] font-bold flex items-center justify-center',
                      isActive ? 'bg-white text-[#1769E0]' : 'bg-[#1769E0] text-white'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1769E0]/20 border border-[#1769E0]/40 flex items-center justify-center text-[#1769E0] shrink-0">
              <Shield className="w-4 h-4 fill-[#1769E0]" />
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-none">MedTrace</div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                Trusted by Healthcare.
                <br />
                Protected from Re-entry.
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. RIGHT AREA: TOP HEADER + MAIN CONTENT                                  */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          {/* Mobile menu trigger + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="truncate">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Operations Portal &rsaquo; </span>
              <span className="text-xs font-bold text-[#0B1B3A] capitalize">
                {currentRole} Workspace
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Role Badge */}
            <span className="px-2.5 py-1 bg-[#1769E0] text-white text-[11px] sm:text-xs font-semibold rounded-lg capitalize tracking-wide shadow-2xs">
              {currentRole}
            </span>

            {/* Organization Context Pill */}
            <Link
              href="/login"
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition max-w-[130px] sm:max-w-[200px]"
              title="Switch Organization / Stakeholder Persona"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{currentOrg.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>

            {/* User Account Avatar */}
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1769E0] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {currentOrg.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0B1B3A] text-white p-4 space-y-1 border-b border-slate-800 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2 border-b border-slate-800 mb-2">
              {currentRole.toUpperCase()} PORTAL NAVIGATION
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#1769E0]" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1769E0] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
