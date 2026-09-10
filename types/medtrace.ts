import { Batch, Org, Alert, AuditLog, ReturnRequest, Pickup, Destruction, DestructionCertificate, Scan } from './database';

export type ExpiryCategory = 'NORMAL' | 'EXPIRING_SOON' | 'URGENT' | 'EXPIRED';

export interface ExpiryStatus {
  category: ExpiryCategory;
  daysRemaining: number;
  label: string;
  badgeClass: string;
}

export interface SaleAttemptResult {
  blocked: boolean;
  severity?: 'WARNING' | 'HIGH' | 'CRITICAL';
  message: string;
  batch?: Batch;
  destroyedAt?: string;
  certificateNo?: string;
  facilityName?: string;
  alertId?: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  actor: string;
  badge: string;
  badgeColor: 'emerald' | 'amber' | 'blue' | 'rose' | 'purple' | 'gray';
  metadata?: Record<string, any>;
}

export interface Batch360Data {
  batch: Batch;
  timeline: TimelineEvent[];
  returnRequest?: ReturnRequest | null;
  pickup?: Pickup | null;
  destruction?: Destruction | null;
  certificate?: DestructionCertificate | null;
  isRegisteredDestroyed: boolean;
  scans: Scan[];
  alerts: Alert[];
  auditLogs: AuditLog[];
}
