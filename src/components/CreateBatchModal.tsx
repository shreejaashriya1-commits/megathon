'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  X,
  PackagePlus,
  QrCode,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBatchModal({ isOpen, onClose, onSuccess }: CreateBatchModalProps) {
  const { currentOrg } = useRole();
  const [productName, setProductName] = useState('Paracetamol 650mg');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [expiryDate, setExpiryDate] = useState('2026-08-25');
  const [holderOrgId, setHolderOrgId] = useState('1'); // 1 = Apollo Pharmacy
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdBatch, setCreatedBatch] = useState<any | null>(null);

  // Handle ESC key to exit modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDone();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateSuggestion = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setBatchNumber(`PCM2026B${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const targetBatchNumber = batchNumber.trim() || `PCM2026B${Math.floor(100 + Math.random() * 900)}`;

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: targetBatchNumber,
          product_name: productName,
          quantity: parseInt(quantity, 10),
          expiry_date: expiryDate,
          manufacturer_org_id: currentOrg.id,
          holder_org_id: parseInt(holderOrgId, 10),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCreatedBatch(json.data);
        onSuccess();
      } else {
        setErrorMessage(json.error || 'Failed to create medicine batch');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error creating medicine batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setCreatedBatch(null);
    setBatchNumber('');
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleDone(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1769E0] text-white flex items-center justify-center">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Generate Medicine Batch &amp; QR</h3>
              <p className="text-xs text-slate-300">
                Source batch creation and unique QR-linked batch identity generation
              </p>
            </div>
          </div>
          <button
            onClick={handleDone}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {createdBatch ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Batch Created &amp; Permanently Registered</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Unique batch identity and QR token issued to the immutable ledger.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Number:</span>
                  <span className="font-bold text-slate-900">{createdBatch.batch_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">QR Token:</span>
                  <span className="font-bold text-[#1769E0]">{createdBatch.qr_token}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Initial Status:</span>
                  <span className="font-bold text-emerald-600">ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Holder:</span>
                  <span className="font-bold text-slate-900">
                    {createdBatch.current_holder?.name || 'Apollo Pharmacy - Ajmer'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleDone}
                className="w-full py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Return to Manufacturer Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Formulation</label>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769E0]"
                >
                  <option value="Paracetamol 650mg">Paracetamol 650mg (Analgesic)</option>
                  <option value="Amoxicillin 500mg">Amoxicillin 500mg (Antibiotic)</option>
                  <option value="Azithromycin 500mg">Azithromycin 500mg (Antibiotic)</option>
                  <option value="Metformin 500mg">Metformin 500mg (Antidiabetic)</option>
                  <option value="Atorvastatin 20mg">Atorvastatin 20mg (Statin)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Batch Number</label>
                  <button
                    type="button"
                    onClick={handleGenerateSuggestion}
                    className="text-[11px] text-[#1769E0] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-suggest
                  </button>
                </div>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. PCM2026A01, PCM2026B01"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769E0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769E0]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769E0]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Pharmacy / Holder</label>
                <select
                  value={holderOrgId}
                  onChange={(e) => setHolderOrgId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769E0]"
                >
                  <option value="1">Apollo Pharmacy - Ajmer (Retailer)</option>
                  <option value="2">City Medicos (Retailer)</option>
                  <option value="3">Sunrise Pharmacy (Retailer)</option>
                  <option value="4">MedLine Distributors (Central Hub)</option>
                  <option value="5">Cipla Ltd (Manufacturer Warehouse)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200/70 rounded-xl flex items-center gap-2 text-blue-900">
                <QrCode className="w-4 h-4 text-[#1769E0] shrink-0" />
                <span>
                  QR Token will be automatically generated as{' '}
                  <code className="font-bold">{(batchNumber.trim() || 'BATCH-NO') + '-TOKEN'}</code>
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDone}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Batch & QR'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
