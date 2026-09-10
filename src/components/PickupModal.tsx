'use client';

import React, { useState } from 'react';
import { ReturnRequest } from '@/../types/database';
import { useRole } from '@/context/RoleContext';
import { X, Truck, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface PickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  returnRequest: ReturnRequest | null;
  mode?: 'confirm' | 'resolve';
}

export function PickupModal({ isOpen, onClose, onSuccess, returnRequest, mode = 'confirm' }: PickupModalProps) {
  const { currentOrg } = useRole();
  const [qtyInput, setQtyInput] = useState<string>(
    returnRequest ? String(returnRequest.qty_claimed) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (returnRequest) {
      setQtyInput(String(returnRequest.qty_claimed));
      setErrorMessage(null);
    }
  }, [returnRequest, isOpen]);

  // Handle ESC key to exit modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !returnRequest) return null;

  const isResolveMode = mode === 'resolve' || returnRequest.status === 'disputed';
  const claimedQty = returnRequest.qty_claimed;
  const currentVal = parseInt(qtyInput, 10);
  const isMismatch = !isResolveMode && !isNaN(currentVal) && currentVal !== claimedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty < 0) {
      setErrorMessage('Please enter a valid received quantity (0 or greater).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isResolveMode) {
        // Resolve dispute
        const res = await fetch(`/api/disputes/${returnRequest.id}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corrected_qty: qty,
            distributor_org_id: currentOrg.id,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setErrorMessage(json.error || 'Failed to resolve dispute');
          return;
        }
      } else {
        // Confirm pickup
        const res = await fetch(`/api/returns/${returnRequest.id}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qty_received: qty,
            distributor_org_id: currentOrg.id,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setErrorMessage(json.error || 'Failed to confirm pickup');
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error processing logistics intake');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between text-white shrink-0 ${isResolveMode ? 'bg-amber-950' : 'bg-[#0B1B3A]'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isResolveMode ? 'bg-amber-600/30 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isResolveMode ? 'Resolve Quantity Dispute' : 'Verify & Confirm Physical Intake'}
              </h3>
              <p className="text-xs text-slate-300">
                {isResolveMode ? 'Correct discrepancy and transition custody' : 'Audit physical intake against pharmacy claim'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{returnRequest.batch?.medicine?.name || 'Pharmaceutical Batch'}</span>
              <span className="font-mono text-[#1769E0]">{returnRequest.batch_number}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Initiating Pharmacy:</span>
              <span className="font-semibold">{returnRequest.retailer?.name || 'Pharmacy'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Quantity Claimed by Pharmacy:</span>
              <span className="font-bold text-slate-900 text-sm">{claimedQty} units</span>
            </div>
            {returnRequest.condition && (
              <div className="pt-1 text-slate-500 italic">"{returnRequest.condition}"</div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {isResolveMode ? 'Agreed / Corrected Physical Quantity' : 'Physical Quantity Received at Hub'}
            </label>
            <input
              type="number"
              min="0"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1769E0] font-semibold"
              required
            />
          </div>

          {/* Real-time Mismatch Warning */}
          {isMismatch && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3 text-xs text-orange-900">
              <div className="flex items-center gap-2 font-bold text-orange-900">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Quantity Mismatch Detected</span>
              </div>
              <div className="grid grid-cols-4 gap-2 bg-white/80 p-2.5 rounded-lg border border-orange-200 text-center">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase">CLAIMED</span>
                  <span className="font-bold text-slate-900">{claimedQty} units</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-orange-700 uppercase">RECEIVED</span>
                  <span className="font-bold text-orange-950">{currentVal} units</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-rose-700 uppercase">DIFFERENCE</span>
                  <span className="font-bold text-rose-900">{Math.abs(claimedQty - currentVal)} units</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-amber-700 uppercase">RESULT</span>
                  <span className="font-black text-rose-700">DISPUTED</span>
                </div>
              </div>
              <p className="text-orange-800 text-[11px] leading-relaxed">
                Submitting this will flag this return as <strong className="text-orange-950 font-bold">DISPUTED</strong>. Physical pickup will not be silently confirmed, and manufacturer destruction will be strictly blocked until authorized resolution.
              </p>
            </div>
          )}

          {!isMismatch && !isResolveMode && !isNaN(currentVal) && currentVal === claimedQty && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Exact quantity match ({claimedQty} units). Will transition to <strong>RETURN_CONFIRMED</strong>.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-2 ${
                isResolveMode
                  ? 'bg-amber-700 hover:bg-amber-600'
                  : isMismatch
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-[#1769E0] hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : isResolveMode ? (
                'Confirm Dispute Resolution'
              ) : isMismatch ? (
                'Log Intake Discrepancy (DISPUTED)'
              ) : (
                'Confirm Pickup (RETURN_CONFIRMED)'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
