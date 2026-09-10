export type OrgRole = 'retailer' | 'distributor' | 'manufacturer' | 'regulator';

export type BatchStatus = 'ACTIVE' | 'RETURN_INITIATED' | 'RETURN_CONFIRMED' | 'DISPUTED' | 'DESTROYED';

export type ReturnStatus = 'pending' | 'confirmed' | 'disputed';

export type ScanAction = 'lookup' | 'sale_attempt';

export type ScanResult = 'allowed' | 'blocked';

export type AlertSeverity = 'WARNING' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'open' | 'investigating' | 'resolved';

export interface Org {
  id: number;
  name: string;
  role: OrgRole;
  location: string | null;
  created_at?: string;
}

export interface Medicine {
  id: number;
  name: string;
  generic_name: string | null;
  manufacturer_org_id: number | null;
  category: string | null;
  dosage_form: string | null;
  created_at?: string;
}

export interface Batch {
  batch_number: string;
  medicine_id: number;
  quantity: number;
  mfg_date: string | null;
  expiry_date: string;
  current_holder_org_id: number | null;
  status: BatchStatus;
  qr_token: string | null;
  created_at?: string;
  medicine?: Medicine;
  current_holder?: Org;
  manufacturer?: Org;
}

export interface ReturnRequest {
  id: number;
  batch_number: string;
  retailer_org_id: number;
  qty_claimed: number;
  condition: string | null;
  photo_url: string | null;
  status: ReturnStatus;
  created_at?: string;
  batch?: Batch;
  retailer?: Org;
  pickup?: Pickup;
  distributor?: Org;
}

export interface Pickup {
  id: number;
  return_request_id: number;
  distributor_org_id: number;
  qty_received: number;
  disputed: boolean;
  confirmed_at?: string;
  return_request?: ReturnRequest;
  distributor?: Org;
}

export interface Destruction {
  id: number;
  batch_number: string;
  manufacturer_org_id: number;
  facility_name: string;
  qty_destroyed: number;
  evidence_url: string | null;
  destroyed_at?: string;
  manufacturer?: Org;
}

export interface DestructionCertificate {
  id: number;
  batch_number: string;
  destruction_id: number;
  certificate_no: string;
  issued_at?: string;
  destruction?: Destruction;
  batch?: Batch;
}

export interface BatchRegistry {
  batch_number: string;
  terminal_status: 'DESTROYED';
  destroyed_at?: string;
}

export interface Scan {
  id: number;
  batch_number: string | null;
  org_id: number | null;
  action: ScanAction;
  result: ScanResult;
  created_at?: string;
  org?: Org;
}

export interface Alert {
  id: number;
  batch_number: string | null;
  attempted_by_org_id: number | null;
  severity: AlertSeverity;
  reason: string;
  status: AlertStatus;
  created_at?: string;
  attempted_by?: Org;
}

export interface AuditLog {
  id: number;
  actor_org_id: number | null;
  action: string;
  entity: string;
  old_state: string | null;
  new_state: string | null;
  created_at?: string;
  actor?: Org;
}
