'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { X, Flame, FileCheck2, Upload, AlertCircle, CheckCircle2, ShieldAlert, ImageOff } from 'lucide-react';
import { DestructionCertificate } from '@/../types/database';

interface DestructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchData: any | null; // confirmed pickup batch
}

export function DestructionModal({ isOpen, onClose, onSuccess, batchData }: DestructionModalProps) {
  const { currentOrg } = useRole();
  const [step, setStep] = useState<'log' | 'cert' | 'done'>('log');
  const [facilityName, setFacilityName] = useState<string>(
    'Cipla Hazardous Incineration Facility Unit 4, Verna, Goa'
  );
  const [qtyDestroyed, setQtyDestroyed] = useState<string>(
    batchData ? String(batchData.batch.quantity) : ''
  );
  const [evidenceUrl, setEvidenceUrl] = useState<string>('/demo/evidence/amx-incineration.jpg');
  const [imageError, setImageError] = useState<boolean>(false);
  const [destructionId, setDestructionId] = useState<number | null>(
    batchData?.destruction?.id || null
  );
  const [issuedCertificate, setIssuedCertificate] = useState<DestructionCertificate | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (batchData) {
      setQtyDestroyed(String(batchData.batch.quantity));
      setStep('log');
      setDestructionId(batchData?.destruction?.id || null);
      setIssuedCertificate(null);
      setErrorMessage(null);
      setImageError(false);
    }
  }, [batchData, isOpen]);

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

  if (!isOpen || !batchData) return null;

  const batchNumber = batchData.batch.batch_number;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'destruction-evidence');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setEvidenceUrl(json.data.url);
      } else {
        setErrorMessage(json.error || 'Upload error');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload destruction evidence');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogDestruction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const qty = parseInt(qtyDestroyed, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid destruction quantity.');
      return;
    }

    if (!facilityName.trim()) {
      setErrorMessage('Facility name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/destructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: batchNumber,
          manufacturer_org_id: currentOrg.id,
          facility_name: facilityName.trim(),
          qty_destroyed: qty,
          evidence: evidenceUrl,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || 'Failed to log destruction');
        return;
      }

      setDestructionId(json.data.id);
      setStep('cert');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error logging destruction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!destructionId) {
      setErrorMessage('No destruction record found to certify.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: batchNumber,
          destruction_id: destructionId,
          actor_org_id: currentOrg.id,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || 'Failed to issue certificate');
        return;
      }

      setIssuedCertificate(json.data);
      setStep('done');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error issuing certificate');
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
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600/30 text-rose-400 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {step === 'done' ? 'Destruction Certified & Locked' : 'Execute & Certify Batch Destruction'}
              </h3>
              <p className="text-xs text-slate-400">MedTrace Digital Destruction Protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold shrink-0">
          <span className={step === 'log' ? 'text-[#1769E0]' : 'text-slate-500'}>
            1. Log Hazardous Destruction
          </span>
          <span>&rarr;</span>
          <span className={step === 'cert' ? 'text-[#1769E0]' : 'text-slate-500'}>
            2. Issue Official Certificate
          </span>
          <span>&rarr;</span>
          <span className={step === 'done' ? 'text-rose-700' : 'text-slate-500'}>
            3. Permanent Ledger Lock
          </span>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Batch Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{batchData.batch.medicine?.name}</span>
              <span className="font-mono text-[#1769E0] font-bold">{batchNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Verified Custody Quantity:</span>
              <span className="font-semibold">{batchData.batch.quantity} units</span>
            </div>
          </div>

          {/* STEP 1: LOG DESTRUCTION FORM */}
          {step === 'log' && (
            <form onSubmit={handleLogDestruction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Certified Destruction Facility</label>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1769E0]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Quantity Destroyed (Incinerated/Autoclaved)</label>
                <input
                  type="number"
                  min="1"
                  value={qtyDestroyed}
                  onChange={(e) => setQtyDestroyed(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1769E0]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Destruction / Incineration Evidence Photo</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-[#1769E0] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 transition">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-600">
                      {isUploading ? 'Uploading...' : 'Choose or capture incineration evidence'}
                    </span>
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

                  {evidenceUrl && (
                    imageError ? (
                      <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 flex flex-col items-center justify-center text-center shrink-0">
                        <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-600 leading-tight">Evidence unavailable</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Image could not be loaded</span>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 relative group">
                        <img
                          src={evidenceUrl}
                          alt="Evidence"
                          className="w-full h-full object-cover"
                          onError={() => setImageError(true)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEvidenceUrl('');
                            setImageError(false);
                          }}
                          className="absolute top-1 right-1 bg-black/75 hover:bg-black text-white rounded-full p-1 transition opacity-80 hover:opacity-100"
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2"
                >
                  {isSubmitting ? 'Logging...' : 'Confirm Destruction Execution'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ISSUE CERTIFICATE */}
          {step === 'cert' && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
                  <CheckCircle2 className="w-5 h-5 text-[#1769E0]" />
                  <span>Destruction Record Logged Successfully (#{destructionId})</span>
                </div>
                <p className="pt-1">
                  Physical destruction has been verified and registered. The final step is to issue the application-generated
                  <strong> Certificate of Destruction</strong>.
                </p>
                <p className="font-semibold text-rose-900 pt-1">
                  IMPORTANT: Issuing this certificate transitions the batch status to DESTROYED and writes its identity permanently into the immutable batch_registry.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close (Draft Saved)
                </button>
                <button
                  type="button"
                  onClick={handleIssueCertificate}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2"
                >
                  <FileCheck2 className="w-4 h-4" />
                  {isSubmitting ? 'Issuing Certificate & Locking Registry...' : 'Issue Certificate & Lock Registry'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DONE - CERTIFICATE DISPLAY */}
          {step === 'done' && issuedCertificate && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-300 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-rose-600" />
                    <div>
                      <h4 className="font-black text-rose-900 text-sm tracking-wide">
                        MEDTRACE DIGITAL DESTRUCTION CERTIFICATE
                      </h4>
                      <p className="text-[11px] font-mono text-rose-700">
                        Ref: {issuedCertificate.certificate_no} &bull; Application-Generated Demo Record
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-xs rounded-md shadow-sm">
                    TERMINAL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 border-t border-rose-200/60 pt-3">
                  <div>Batch Number: <strong className="font-mono text-slate-900">{issuedCertificate.batch_number}</strong></div>
                  <div>Issued Date: <strong>{new Date(issuedCertificate.issued_at || '').toLocaleDateString('en-IN')}</strong></div>
                  <div>Facility: <strong>{facilityName}</strong></div>
                  <div>Status: <strong className="text-rose-700">DESTROYED (Permanent)</strong></div>
                </div>

                <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-[11px] text-rose-900 font-medium leading-relaxed">
                  ✓ Recorded in demonstration <code>batch_registry</code>. Any future attempt to dispense or sell this batch identity will be automatically blocked and reported to regulators.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow"
                >
                  Done &amp; Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
