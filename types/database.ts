export type OrgRole = 'retailer' | 'distributor' | 'manufacturer' | 'regulator';

export type BatchStatus = 'ACTIVE' | 'RETURN_INITIATED' | 'RETURN_CONFIRMED' | 'DISPUTED' | 'DESTROYED';

export type ReturnStatus = 'pending' | 'confirmed' | 'disputed';

export type ScanAction = 'lookup' | 'sale_attempt';

export type ScanResult = 'allowed' | 'blocked';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WARNING';

export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'acknowledged';

export type AlertCategory =
  | 'EXPIRY'
  | 'QUANTITY_DISCREPANCY'
  | 'RETURN_DISCREPANCY'
  | 'DESTRUCTION'
  | 'DESTROYED_REENTRY'
  | 'QR_SERIAL_MISMATCH'
  | 'DUPLICATE_SERIAL'
  | 'UNAUTHORIZED_CUSTODY'
  | 'UNEXPECTED_MOVEMENT'
  | 'CERTIFICATE_ANOMALY'
  | 'REPEATED_VIOLATION'
  | 'SUSPICIOUS_TRANSACTION'
  | 'INVENTORY_MISMATCH'
  | 'SYSTEM_OPERATIONAL';

export type StakeholderRole = 'retailer' | 'distributor' | 'manufacturer' | 'waste_facility' | 'regulator' | 'admin';

export type CaseStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'ACTION_REQUIRED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'CLOSED';

export type EscalationLevel = 'NONE' | 'ORG_LEVEL' | 'COMPLIANCE' | 'REGULATOR';

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
  // Extended Intelligence Layer fields
  category?: AlertCategory;
  subcategory?: string;
  risk_score?: number;
  serial_id?: string | null;
  organization_id?: number | null;
  detected_actor?: string | null;
  current_holder?: string | null;
  source_event?: string | null;
  evidence?: string | null;
  assigned_stakeholder?: StakeholderRole | null;
  case_id?: string | number | null;
  escalation_level?: EscalationLevel;
  occurrence_count?: number;
  last_seen_at?: string;
}

export interface CaseTimelineEntry {
  id: string;
  timestamp: string;
  title?: string;
  description?: string;
  action?: string;
  note?: string;
  actor?: string;
  severity?: AlertSeverity;
  metadata?: Record<string, any>;
}

export interface InvestigationCase {
  id: string;
  case_number?: string;
  title: string;
  category: AlertCategory;
  severity: AlertSeverity;
  risk_score: number;
  primary_organization_id?: number;
  primary_org_id?: number;
  primary_org?: Org;
  status: CaseStatus;
  first_detected_at?: string;
  last_detected_at: string;
  occurrence_count: number;
  escalation_level: EscalationLevel;
  assigned_stakeholder: StakeholderRole;
  assigned_org_id?: number | null;
  affected_batches: string[];
  affected_serials?: string[];
  related_alert_ids: number[];
  ai_anomaly_data?: {
    anomaly_score: number;
    confidence: number;
    reasons: string[];
    features?: Record<string, any>;
  };
  anomaly_factors?: string[];
  anomaly_score?: number;
  root_cause?: string;
  recommended_action?: string;
  timeline: CaseTimelineEntry[];
  created_at: string;
  updated_at?: string;
  primary_organization?: Org;
  assigned_organization?: Org;
}

export interface Notification {
  id: any;
  recipient_role: StakeholderRole;
  recipient_org_id?: number | null;
  alert_id?: number | null;
  case_id?: string | number | null;
  type?: string;
  priority: AlertSeverity | string;
  title: string;
  message: string;
  is_read?: boolean;
  read_at?: string | null;
  created_at: string;
  actionable_message?: {
    what?: string;
    where?: string;
    when?: string;
    why?: string;
    who?: string;
    recommended_action?: string;
  };
}

export interface OrganizationRiskProfile {
  org_id: number;
  org_name: string;
  role: OrgRole;
  total_cases?: number;
  open_cases?: number;
  unresolved_cases_count?: number;
  critical_cases_count?: number;
  discrepancy_count?: number;
  unauthorized_custody_count?: number;
  duplicate_serial_count?: number;
  risk_score?: number;
  overall_risk_score?: number;
  risk_tier: AlertSeverity | string;
  last_evaluated_at: string;
  risk_factors?: string[];
  risk_signals?: string[];
  recommended_action?: string;
}

export interface RawEvent {
  id?: string;
  event_type: string;
  timestamp?: string;
  batch_number?: string;
  serial_id?: string;
  actor_org_id?: number;
  target_org_id?: number;
  claimed_quantity?: number;
  received_quantity?: number;
  condition?: string;
  location?: string;
  qr_token?: string;
  evidence_url?: string;
  metadata?: Record<string, any>;
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
