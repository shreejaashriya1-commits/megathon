'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';
import { Batch } from '@/../types/database';

interface QrScannerProps {
  onScanSuccess: (token: string, batch?: Batch) => void;
  onScanError?: (error: string) => void;
  onSwitchToManual?: () => void;
  autoResolve?: boolean;
}

export function QrScanner({
  onScanSuccess,
  onScanError,
  onSwitchToManual,
  autoResolve = true,
}: QrScannerProps) {
  const [scanning, setScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<boolean>(false);
  const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const rawId = useId();
  const scannerContainerId = `medtrace-qr-reader-${rawId.replace(/:/g, '')}`;

  // Stop scanner utility
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
    }
    setScanning(false);
  };

  // Process successful decode from either camera or image upload
  const handleSuccessfulScan = async (rawToken: string) => {
    await stopScanner();
    const token = rawToken.trim();
    setLastScannedToken(token);

    if (autoResolve) {
      setResolving(true);
      try {
        const res = await fetch(`/api/batches/resolve?qr_token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (json.success && json.data) {
          onScanSuccess(token, json.data);
        } else {
          onScanSuccess(token, undefined);
          if (onScanError) onScanError(json.error || 'Token resolved without batch data');
        }
      } catch (err: any) {
        onScanSuccess(token, undefined);
        if (onScanError) onScanError(err?.message || 'Failed to resolve QR token from server');
      } finally {
        setResolving(false);
      }
    } else {
      onScanSuccess(token);
    }
  };

  // Robust camera initializer with hardware webcam & mobile fallbacks
  const startScanner = async (overrideCamId?: string) => {
    setScannerError(null);

    // Verify DOM container exists
    const containerEl = document.getElementById(scannerContainerId);
    if (!containerEl) {
      setTimeout(() => startScanner(overrideCamId), 150);
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      // 1. Enumerate available cameras
      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        setAvailableCameras(cameras);
      } catch (e) {
        console.warn('Could not enumerate cameras, falling back to constraint query:', e);
      }

      // 2. Select preferred camera
      let cameraConfig: any = overrideCamId || selectedCameraId;
      if (!cameraConfig) {
        if (cameras && cameras.length > 0) {
          // If on mobile/tablet, prefer rear/environment camera; otherwise default to webcam
          const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label));
          cameraConfig = backCam ? backCam.id : cameras[0].id;
          setSelectedCameraId(cameraConfig);
        } else {
          // Fallback to generic user-facing or environment
          cameraConfig = { facingMode: 'user' };
        }
      }

      // 3. Attempt camera start
      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(Math.floor(minEdge * 0.75), 180);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // frame scan miss - no-op
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.warn('First camera attempt failed, trying fallback mode:', err);

      // Fallback attempt: try facingMode: 'user' or simple constraint
      try {
        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            async (decodedText) => {
              handleSuccessfulScan(decodedText);
            },
            () => {}
          );
          setScanning(true);
          return;
        }
      } catch (fallbackErr: any) {
        console.warn('Camera fallback attempt failed:', fallbackErr);
      }

      const isPermissionDenied =
        err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('permission');

      setScannerError(
        isPermissionDenied
          ? 'Camera permission was denied. Please allow camera permissions in browser site settings, or use manual batch entry.'
          : err?.message || 'Hardware camera is currently unavailable. You can upload a QR image or enter the batch number manually.'
      );
      setScanning(false);
    }
  };

  // Upload and scan QR image file directly
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setScannerError(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      // If active, pause video scanner while decoding file
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        setScanning(false);
      }

      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      handleSuccessfulScan(decodedText);
    } catch (err: any) {
      console.warn('QR file scan error:', err);
      setScannerError('Could not detect a valid QR code in the uploaded image. Please try a clearer image or enter the batch manually.');
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      e.target.value = '';
    }
  };

  useEffect(() => {
    // Attempt camera initialization on mount
    startScanner();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.warn);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header with Camera Status & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#1769E0]" />
          <span className="text-xs sm:text-sm font-bold text-[#0B1B3A]">
            Hardware Camera &amp; QR Scanner
          </span>
          {scanning && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Stream
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {availableCameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startScanner(e.target.value);
              }}
              className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
            >
              {availableCameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {scanning ? (
            <button
              type="button"
              onClick={stopScanner}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
            >
              <CameraOff className="w-3.5 h-3.5" /> Pause Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startScanner()}
              className="text-xs text-[#1769E0] hover:text-blue-800 flex items-center gap-1 font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start Camera
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative overflow-hidden rounded-xl bg-[#0B1B3A] border border-slate-800 min-h-[260px] sm:min-h-[300px] flex items-center justify-center">
        {/* Html5Qrcode target container */}
        <div id={scannerContainerId} className="w-full max-w-sm [&>video]:rounded-lg [&>video]:w-full" />

        {/* Server Resolving Overlay */}
        {resolving && (
          <div className="absolute inset-0 bg-[#0B1B3A]/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-10">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-2" />
            <p className="text-sm font-bold">Verifying unique QR-linked batch identity with server...</p>
            <p className="text-xs text-slate-300 mt-1 font-mono">Querying immutable registry &amp; audit history</p>
          </div>
        )}

        {/* File Decoding Overlay */}
        {isProcessingFile && (
          <div className="absolute inset-0 bg-[#0B1B3A]/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-10">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-2" />
            <p className="text-sm font-bold">Decoding QR image file...</p>
          </div>
        )}

        {/* Camera Idle / Paused State */}
        {!scanning && !resolving && !isProcessingFile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center z-5 bg-[#0B1B3A]">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
              <Camera className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-200 font-bold">Camera is paused or unavailable</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Position package QR code in front of lens or upload a photo of the package
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => startScanner()}
                className="px-4 py-2 bg-[#1769E0] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Connect Camera
              </button>
              {onSwitchToManual && (
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Keyboard className="w-3.5 h-3.5" /> Manual Entry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error & Permission Guidance Banner */}
      {scannerError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Camera Access Notice</p>
              <p className="text-amber-800 mt-0.5">{scannerError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => startScanner()}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-xs transition"
            >
              Retry Camera
            </button>
            {onSwitchToManual && (
              <button
                type="button"
                onClick={onSwitchToManual}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#0B1B3A] hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition"
              >
                Enter Manually
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alternative Input Options: File Upload & Quick Scans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Option 1: File Image Upload */}
        <label className="border-2 border-dashed border-slate-200 hover:border-[#1769E0] rounded-xl p-3 flex items-center gap-3 cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition group">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0 group-hover:bg-[#1769E0] group-hover:text-white transition">
            <Upload className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-slate-800">Scan QR Code from Photo</span>
            <span className="block text-[11px] text-slate-500 truncate">Upload or drop QR code image file</span>
          </div>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Option 2: Direct Manual Entry Trigger */}
        {onSwitchToManual && (
          <button
            type="button"
            onClick={onSwitchToManual}
            className="border border-slate-200 hover:border-blue-300 rounded-xl p-3 flex items-center gap-3 bg-slate-50/50 hover:bg-blue-50/30 text-left transition group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-[#0B1B3A] group-hover:text-white transition">
              <Keyboard className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-slate-800">Manual Batch Entry</span>
              <span className="block text-[11px] text-slate-500 truncate">Type batch number like PCM2026A01</span>
            </div>
          </button>
        )}
      </div>

      {/* Last Scanned Status Pill */}
      {lastScannedToken && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-950 font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#1769E0]" />
            <span>Decoded Token: <strong>{lastScannedToken}</strong></span>
          </div>
          <span className="text-[10px] uppercase font-bold text-[#1769E0] bg-blue-100 px-2 py-0.5 rounded">
            Verified
          </span>
        </div>
      )}

      {/* Pre-encoded Quick Test Tokens */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Test Pre-Encoded QR Identifiers:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleSuccessfulScan('PCM2026A01-TOKEN')}
            className="text-left p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs transition"
          >
            <div className="font-bold text-slate-800 truncate">Paracetamol 650mg</div>
            <div className="text-[10.5px] text-amber-700 font-mono truncate">PCM2026A01-TOKEN</div>
          </button>

          <button
            type="button"
            onClick={() => handleSuccessfulScan('AMX-DEMO-001-TOKEN')}
            className="text-left p-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 text-xs transition"
          >
            <div className="font-bold text-rose-900 truncate">Amoxicillin (Destroyed)</div>
            <div className="text-[10.5px] text-rose-700 font-mono truncate">AMX-DEMO-001-TOKEN</div>
          </button>

          <button
            type="button"
            onClick={() => handleSuccessfulScan('AZI-2026-088-TOKEN')}
            className="text-left p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs transition col-span-2 sm:col-span-1"
          >
            <div className="font-bold text-slate-800 truncate">Azithromycin 500mg</div>
            <div className="text-[10.5px] text-[#1769E0] font-mono truncate">AZI-2026-088-TOKEN</div>
          </button>
        </div>
      </div>
    </div>
  );
}
