'use client';

import React, { useState } from 'react';
import { Batch } from '@/../types/database';
import { QrScanner } from './QrScanner';
import { X, Upload, CheckCircle2, AlertCircle, ArrowRightLeft, Camera, ImageOff } from 'lucide-react';
import { useRole } from '@/context/RoleContext';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedBatch?: Batch | null;
}

export function ReturnModal({ isOpen, onClose, onSuccess, preselectedBatch }: ReturnModalProps) {
  const { currentOrg } = useRole();
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>(preselectedBatch ? 'manual' : 'qr');
  const [batchNumber, setBatchNumber] = useState<string>(preselectedBatch?.batch_number || '');
  const [resolvedBatch, setResolvedBatch] = useState<Batch | null>(preselectedBatch || null);
  const [quantityClaimed, setQuantityClaimed] = useState<string>(
    preselectedBatch ? String(preselectedBatch.quantity) : ''
  );
  const [condition, setCondition] = useState<string>('Expired foil blister packs; intact packaging');
  const [photoUrl, setPhotoUrl] = useState<string>('/demo/evidence/amx-return.jpg');
  const [imageError, setImageError] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (preselectedBatch) {
      setBatchNumber(preselectedBatch.batch_number);
      setResolvedBatch(preselectedBatch);
      setQuantityClaimed(String(preselectedBatch.quantity));
      setActiveTab('manual');
      setErrorMessage(null);
    }
  }, [preselectedBatch, isOpen]);

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

  if (!isOpen) return null;

  const handleScanSuccess = (token: string, batch?: Batch) => {
    if (batch) {
      setResolvedBatch(batch);
      setBatchNumber(batch.batch_number);
      setQuantityClaimed(String(batch.quantity));
      setErrorMessage(null);
    } else {
      setBatchNumber(token);
    }
  };

  const handleManualResolve = async () => {
    if (!batchNumber.trim()) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/batches`);
      const json = await res.json();
      if (json.success && json.data) {
        const found = json.data.find((b: Batch) => b.batch_number.toUpperCase() === batchNumber.trim().toUpperCase());
        if (found) {
          setResolvedBatch(found);
          setQuantityClaimed(String(found.quantity));
        } else {
          setErrorMessage(`Batch '${batchNumber}' not found in active inventory.`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to verify batch');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'return-evidence');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setPhotoUrl(json.data.url);
      } else {
        setErrorMessage(json.error || 'Upload error');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetBatch = batchNumber.trim();
    const qty = parseInt(quantityClaimed, 10);

    if (!targetBatch) {
      setErrorMessage('Please scan QR or enter a batch number.');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid quantity greater than 0.');
      return;
    }

    if (resolvedBatch && qty > resolvedBatch.quantity) {
      setErrorMessage(`Claimed quantity (${qty}) exceeds available batch quantity (${resolvedBatch.quantity}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: targetBatch,
          retailer_org_id: currentOrg.id,
          qty_claimed: qty,
          condition,
          photo: photoUrl,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || 'Failed to initiate return');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error initiating return');
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
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 text-blue-300">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Initiate Pharmaceutical Return</h3>
              <p className="text-xs text-slate-300">Transfer expired batch to Reverse Supply Chain custody</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Method Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
                activeTab === 'qr' ? 'bg-white text-[#1769E0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Hardware QR Scanner
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'manual' ? 'bg-white text-[#1769E0] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Batch Entry
            </button>
          </div>

          {activeTab === 'qr' && (
            <div className="space-y-3">
              <QrScanner
                onScanSuccess={handleScanSuccess}
                onSwitchToManual={() => setActiveTab('manual')}
              />
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Batch Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. PCM2026A01"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1769E0] font-mono"
                />
                <button
                  type="button"
                  onClick={handleManualResolve}
                  className="px-4 py-2 bg-[#0B1B3A] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {/* Resolved Batch Card */}
          {resolvedBatch && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 text-sm">{resolvedBatch.medicine?.name || 'Pharmaceutical Batch'}</span>
                <span className="font-mono text-[#1769E0] bg-blue-100 px-2 py-0.5 rounded font-bold">
                  {resolvedBatch.batch_number}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                <div>Available Qty: <strong>{resolvedBatch.quantity} units</strong></div>
                <div>Expiry Date: <strong className="text-red-700">{resolvedBatch.expiry_date}</strong></div>
              </div>
            </div>
          )}

          {/* Quantity Claimed */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Quantity Claimed for Return</label>
            <input
              type="number"
              min="1"
              value={quantityClaimed}
              onChange={(e) => setQuantityClaimed(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1769E0]"
              required
            />
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Physical Condition / Defect Notes</label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Expired blister packaging; seals intact"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1769E0]"
            />
          </div>

          {/* Photo Evidence Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Photographic Return Evidence</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-[#1769E0] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 transition">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-600">
                  {isUploading ? 'Uploading file...' : 'Choose or snap evidence photo'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, or mobile camera capture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setImageError(false);
                    handleFileUpload(e);
                  }}
                  className="hidden"
                />
              </label>

              {photoUrl && (
                imageError ? (
                  <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 flex flex-col items-center justify-center text-center shrink-0">
                    <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] font-semibold text-slate-600 leading-tight">Evidence unavailable</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Image could not be loaded</span>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 relative group">
                    <img
                      src={photoUrl}
                      alt="Evidence"
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl('');
                        setImageError(false);
                      }}
                      className="absolute top-1 right-1 bg-slate-900/75 hover:bg-slate-900 text-white rounded-full p-1 transition opacity-80 hover:opacity-100"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="px-5 py-2 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-2"
            >
              {isSubmitting ? 'Logging Return...' : 'Confirm Return Initiation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
