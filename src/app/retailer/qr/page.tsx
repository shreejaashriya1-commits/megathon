'use client';

import React from 'react';
import { QrVerificationConsole } from '@/components/QrVerificationConsole';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function RetailerQrPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/retailer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Retailer Inventory
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#1769E0]" />
          <span>MedTrace Compliance Verification Active</span>
        </div>
      </div>

      <QrVerificationConsole roleTitle="Retailer Pharmacy" />
    </div>
  );
}
