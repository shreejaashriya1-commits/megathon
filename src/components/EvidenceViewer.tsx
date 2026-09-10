import React from 'react';
import { Batch360Data } from '@/../types/medtrace';
import { ShieldCheck, FileCheck2, Camera, Flame, Building, AlertCircle, ImageOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface EvidenceViewerProps {
  data: Batch360Data;
}

function EvidencePhoto({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = React.useState(false);

  if (error || !url) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center space-y-1.5">
        <ImageOff className="w-6 h-6 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">Evidence unavailable</span>
        <span className="text-[11px] text-slate-400">Evidence image could not be loaded</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-56 flex items-center justify-center">
      <img
        src={url}
        alt={alt}
        className="w-full h-auto object-cover max-h-56"
        onError={() => setError(true)}
      />
    </div>
  );
}

export function EvidenceViewer({ data }: EvidenceViewerProps) {
  const { returnRequest, pickup, destruction, certificate } = data;

  return (
    <div className="space-y-6">
      {/* 1. Return Intake Evidence */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#0B1B3A] border-b border-slate-100 pb-3">
          <Camera className="w-5 h-5 text-[#1769E0]" />
          <h3 className="font-bold text-sm">Pharmacy Return Evidence &amp; Intake Audit</h3>
        </div>

        {returnRequest ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Return Request Ref:</span>
                <span className="font-mono font-bold">#RET-{returnRequest.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Quantity Claimed by Pharmacy:</span>
                <span className="font-bold text-slate-900">{returnRequest.qty_claimed} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Quantity Verified by Distributor:</span>
                <span className="font-bold text-slate-900">
                  {pickup ? `${pickup.qty_received} units` : 'Pending Pickup Verification'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Inspection Notes:</span>
                <span className="italic">{returnRequest.condition || 'None provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Initiated At:</span>
                <span>{formatDate(returnRequest.created_at)}</span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Physical Return Photographic Proof (Simulated Demo Evidence):
              </span>
              {returnRequest.photo_url ? (
                <EvidencePhoto url={returnRequest.photo_url} alt="Return Evidence" />
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  No photographic evidence uploaded
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400">
            No return request logged for this batch yet.
          </div>
        )}
      </div>

      {/* 2. Destruction & Incineration Evidence */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-950 border-b border-slate-100 pb-3">
          <Flame className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-sm">Hazardous Destruction &amp; Bio-Incineration Record</h3>
        </div>

        {destruction ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Certified Facility:</span>
                <span className="font-bold text-slate-900">{destruction.facility_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Quantity Physically Destroyed:</span>
                <span className="font-bold text-rose-700 text-sm">{destruction.qty_destroyed} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Destruction Execution Timestamp:</span>
                <span>{formatDate(destruction.destroyed_at)}</span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Facility Execution Photographic Evidence (Simulated Demo Evidence):
              </span>
              {destruction.evidence_url ? (
                <EvidencePhoto url={destruction.evidence_url} alt="Destruction Evidence" />
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  No destruction evidence uploaded
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400">
            Destruction has not been executed yet.
          </div>
        )}
      </div>

      {/* 3. Certificate Record */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
          <FileCheck2 className="w-5 h-5 text-[#1769E0]" />
          <h3 className="font-bold text-sm">
            MedTrace Compliance Certificate — Application-Generated Demo
          </h3>
        </div>

        {certificate ? (
          <div className="p-5 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                DEMO • Permanent Terminal Destruction
              </span>
              <h4 className="text-lg font-black text-slate-900 font-mono">
                {certificate.certificate_no}
              </h4>
              <p className="text-xs text-slate-600">
                Application-generated demo certificate &bull; Issued on {formatDate(certificate.issued_at)} by Manufacturer Compliance Officer
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-lg shadow-sm">
                IMMUTABLE
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400">
            No certificate issued for this batch yet.
          </div>
        )}
      </div>
    </div>
  );
}
