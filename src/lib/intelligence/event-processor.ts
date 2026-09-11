import {
  Alert,
  AlertCategory,
  AlertSeverity,
  InvestigationCase,
  Notification,
  RawEvent,
} from '@/../types/database';
import { evaluatePriority, PriorityEvaluationInput } from './priority-engine';
import { globalAnomalyDetector } from './anomaly-detector';
import { groupAlertIntoCase } from './case-grouper';
import { determineStakeholderRouting, buildSmartNotificationMessage } from './router';
import {
  getOrgs,
  getAlerts,
  getInvestigationCases,
  saveInvestigationCase,
  saveAlertDirectly,
  createNotification,
  logAuditAction,
} from '@/lib/supabase/db';

export interface ProcessedEventResult {
  alert: Alert | null;
  caseData: InvestigationCase | null;
  notifications: Notification[];
  isDuplicateSuppressed: boolean;
  isNormalTransaction: boolean;
}

/**
 * Unified Event Intelligence Pipeline.
 * Raw Event -> Classification -> Priority Engine -> Anomaly Detection ->
 * Case Grouping & Deduplication -> Stakeholder Routing -> Actionable Notifications.
 */
export async function processEvent(event: RawEvent): Promise<ProcessedEventResult> {
  const timestamp = event.timestamp || new Date().toISOString();

  // 1. Determine if this raw event warrants an alert
  const classification = classifyRawEvent(event);
  if (!classification) {
    // Normal transaction conforming to protocol -> 0 alerts, 0 cases, 0 spam
    return {
      alert: null,
      caseData: null,
      notifications: [],
      isDuplicateSuppressed: false,
      isNormalTransaction: true,
    };
  }

  const { category, subcategory, reason, initialSeverity, isImmediateCritical } = classification;

  // 2. Fetch context (orgs, historical alerts for actor)
  const orgs = await getOrgs();
  const actorOrg = orgs.find((o) => o.id === event.actor_org_id) || null;
  const targetOrg = orgs.find((o) => o.id === event.target_org_id) || null;
  const allAlerts = await getAlerts();
  const orgAlerts = allAlerts.filter((a) => a.attempted_by_org_id === event.actor_org_id);

  // 3. Deterministic Priority & Risk Evaluation
  const evalInput: PriorityEvaluationInput = {
    category,
    isDestroyedReentry: category === 'DESTROYED_REENTRY',
    isDuplicateSerial: category === 'DUPLICATE_SERIAL',
    isExpiredSaleAttempt: category === 'EXPIRY',
    isQrMismatch: category === 'QR_SERIAL_MISMATCH',
    isUnauthorizedOrg: category === 'UNAUTHORIZED_CUSTODY',
    isCertificateAnomaly: category === 'CERTIFICATE_ANOMALY',
    hasQuantityDiscrepancy: category === 'QUANTITY_DISCREPANCY' || category === 'RETURN_DISCREPANCY',
    discrepancyPercentage: event.claimed_quantity && event.received_quantity && event.claimed_quantity > 0
      ? Math.round((Math.abs(event.claimed_quantity - event.received_quantity) / event.claimed_quantity) * 100)
      : undefined,
    previousViolationsCount: orgAlerts.filter(
      (a) => a.severity === 'HIGH' || a.severity === 'CRITICAL' || a.category === 'DESTROYED_REENTRY' || a.category === 'DUPLICATE_SERIAL' || a.category === 'UNAUTHORIZED_CUSTODY'
    ).length,
    occurrenceCount: 1,
  };

  const priorityResult = evaluatePriority(evalInput);
  const severity: AlertSeverity = initialSeverity || priorityResult.severity;

  // 4. AI / Statistical Anomaly Detection (Enhancement layer)
  const anomalyResult = globalAnomalyDetector.analyze({
    claimedQty: event.claimed_quantity,
    receivedQty: event.received_quantity,
    scansInLastHour: event.event_type.includes('scan') ? 1 : 0,
    returnsInLast30Days: orgAlerts.filter((a) => a.category === 'RETURN_DISCREPANCY').length,
    unauthorizedCustodyAttempts: orgAlerts.filter((a) => a.category === 'UNAUTHORIZED_CUSTODY').length,
    duplicateSerialEvents: orgAlerts.filter((a) => a.category === 'DUPLICATE_SERIAL').length,
  });

  // 5. Create normalized Alert object
  const alertId = allAlerts.length > 0 ? Math.max(...allAlerts.map((a) => a.id)) + 1 : 1;
  const newAlert: Alert = {
    id: alertId,
    batch_number: event.batch_number || null,
    attempted_by_org_id: event.actor_org_id || null,
    severity,
    reason,
    status: 'open',
    created_at: timestamp,
    category,
    subcategory,
    risk_score: priorityResult.riskScore,
    serial_id: event.serial_id || null,
    organization_id: event.actor_org_id || null,
    detected_actor: actorOrg?.name || (event.location || 'Surveillance Node'),
    current_holder: targetOrg?.name || actorOrg?.name || null,
    source_event: event.event_type,
    evidence: event.evidence_url || null,
    assigned_stakeholder: null,
    escalation_level: priorityResult.escalationLevel,
    occurrence_count: 1,
    last_seen_at: timestamp,
  };

  // 6. Case Grouping & Duplicate Suppression
  const existingCases = await getInvestigationCases();
  const groupingDecision = groupAlertIntoCase(
    {
      alert: newAlert,
      organizationId: event.actor_org_id || 1,
      batchNumber: event.batch_number,
      serialId: event.serial_id,
      category,
      timestamp,
      severity,
      riskScore: priorityResult.riskScore,
      evidenceUrl: event.evidence_url,
    },
    existingCases,
    orgAlerts
  );

  const targetCase = groupingDecision.targetCase;
  newAlert.case_id = targetCase.id;
  newAlert.assigned_stakeholder = targetCase.assigned_stakeholder;

  // Attach AI Anomaly data to case
  targetCase.ai_anomaly_data = {
    anomaly_score: anomalyResult.anomalyScore,
    confidence: anomalyResult.confidence,
    reasons: anomalyResult.reasons,
    features: anomalyResult.features,
  };

  // Save case and alert in DB
  await saveInvestigationCase(targetCase);
  await saveAlertDirectly(newAlert);

  // 7. Stakeholder Routing & Actionable Notifications
  const generatedNotifications: Notification[] = [];

  if (groupingDecision.shouldNotifyStakeholder) {
    const routeTargets = determineStakeholderRouting({
      caseData: targetCase,
      alert: newAlert,
      organization: actorOrg,
      counterpartyOrg: targetOrg,
      distributorOrg: actorOrg?.role === 'distributor' ? actorOrg : (targetOrg?.role === 'distributor' ? targetOrg : null),
      retailerOrg: actorOrg?.role === 'retailer' ? actorOrg : (targetOrg?.role === 'retailer' ? targetOrg : null),
      manufacturerOrg: orgs.find((o) => o.role === 'manufacturer') || null,
    });

    for (const target of routeTargets) {
      const { title, message } = buildSmartNotificationMessage(target, {
        caseData: targetCase,
        alert: newAlert,
        organization: actorOrg,
      });

      const notif = await createNotification({
        recipient_role: target.role,
        recipient_org_id: target.orgId || null,
        alert_id: newAlert.id,
        case_id: targetCase.id,
        type: category,
        priority: target.priority,
        title,
        message,
        read_at: null,
        created_at: timestamp,
      });

      generatedNotifications.push(notif);
    }
  }

  // 8. Audit Log
  await logAuditAction({
    actor_org_id: event.actor_org_id || 6,
    action: groupingDecision.isNewCase ? 'CASE_CREATED' : 'CASE_UPDATED',
    entity: targetCase.case_number || targetCase.id,
    old_state: groupingDecision.isNewCase ? null : `COUNT_${targetCase.occurrence_count - 1}`,
    new_state: `SEVERITY_${targetCase.severity}`,
  });

  return {
    alert: newAlert,
    caseData: targetCase,
    notifications: generatedNotifications,
    isDuplicateSuppressed: groupingDecision.isDuplicateSuppressed,
    isNormalTransaction: false,
  };
}

/**
 * Classifies raw event into normalized AlertCategory or null if legitimate transaction.
 */
function classifyRawEvent(event: RawEvent): {
  category: AlertCategory;
  subcategory: string;
  reason: string;
  initialSeverity?: AlertSeverity;
  isImmediateCritical?: boolean;
} | null {
  const type = (event.event_type || '').toUpperCase();

  // Destroyed re-entry attempt
  if (type.includes('DESTROYED') || type === 'DESTROYED_REENTRY' || type === 'SALE_BLOCKED_DESTROYED') {
    return {
      category: 'DESTROYED_REENTRY',
      subcategory: 'TERMINAL_STATUS_BREACH',
      reason: `CRITICAL FRAUD: Attempted sale of permanently DESTROYED batch '${event.batch_number || 'UNKNOWN'}'.`,
      initialSeverity: 'CRITICAL',
      isImmediateCritical: true,
    };
  }

  // Duplicate Serial
  if (type.includes('DUPLICATE_SERIAL') || type === 'SERIAL_COLLISION') {
    return {
      category: 'DUPLICATE_SERIAL',
      subcategory: 'IDENTITY_CLONING',
      reason: `CRITICAL IDENTITY CONFLICT: Duplicate unique serial '${event.serial_id || 'UNKNOWN'}' scanned across separate facilities.`,
      initialSeverity: 'CRITICAL',
      isImmediateCritical: true,
    };
  }

  // QR / Token Mismatch
  if (type.includes('QR_MISMATCH') || type === 'QR_SERIAL_MISMATCH') {
    return {
      category: 'QR_SERIAL_MISMATCH',
      subcategory: 'TOKEN_PAYLOAD_MISMATCH',
      reason: `QR MISMATCH: Scanned token does not correspond to expected cryptographic batch registration.`,
      initialSeverity: 'HIGH',
    };
  }

  // Expired Medicine
  if (type.includes('EXPIRED') || type === 'EXPIRY_DISPENSE') {
    return {
      category: 'EXPIRY',
      subcategory: 'SHELF_LIFE_EXCEEDED',
      reason: `COMPLIANCE WARNING: Attempted dispensing of expired batch '${event.batch_number || 'UNKNOWN'}'.`,
      initialSeverity: 'WARNING',
    };
  }

  // Quantity Discrepancy (Pickup dispute / reconciliation)
  if (type.includes('DISCREPANCY') || type.includes('DISPUTE') || type === 'PICKUP_DISPUTED') {
    const claimed = event.claimed_quantity ?? 0;
    const received = event.received_quantity ?? 0;
    const diff = Math.abs(claimed - received);
    const isSmall = diff === 1;

    return {
      category: 'QUANTITY_DISCREPANCY',
      subcategory: isSmall ? 'MINOR_UNIT_MISMATCH' : 'MAJOR_INVENTORY_VARIANCE',
      reason: `CUSTODY DISCREPANCY: Claimed ${claimed} units, confirmed ${received} units (${diff} unit mismatch).`,
      initialSeverity: isSmall ? 'LOW' : (diff > 10 ? 'HIGH' : 'MEDIUM'),
    };
  }

  // Unauthorized Custody
  if (type.includes('UNAUTHORIZED') || type === 'UNAUTHORIZED_CUSTODY') {
    return {
      category: 'UNAUTHORIZED_CUSTODY',
      subcategory: 'ILLEGAL_CUSTODY_ACQUISITION',
      reason: `UNAUTHORIZED CUSTODY: Batch presented at facility without valid custody transfer record.`,
      initialSeverity: 'HIGH',
    };
  }

  // Certificate Anomaly
  if (type.includes('CERTIFICATE') || type === 'CERTIFICATE_ANOMALY') {
    return {
      category: 'CERTIFICATE_ANOMALY',
      subcategory: 'DOCUMENTATION_FAILURE',
      reason: `REGULATORY ANOMALY: Destruction certificate missing, forged, or issued without physical verification.`,
      initialSeverity: 'HIGH',
    };
  }

  // Normal event types
  if (
    type === 'NORMAL_SALE' ||
    type === 'SALE_ALLOWED' ||
    type === 'LOOKUP_ALLOWED' ||
    type === 'BATCH_CREATED' ||
    type === 'PICKUP_CONFIRMED' ||
    type === 'RETURN_INITIATED' ||
    type === 'CERTIFICATE_ISSUED'
  ) {
    return null;
  }

  return null;
}
