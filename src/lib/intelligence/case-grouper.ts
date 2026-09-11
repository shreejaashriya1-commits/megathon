import {
  Alert,
  AlertCategory,
  AlertSeverity,
  CaseStatus,
  EscalationLevel,
  InvestigationCase,
  StakeholderRole,
} from '@/../types/database';
import { evaluatePriority } from './priority-engine';

export interface GroupingCandidate {
  alert: Alert;
  organizationId: number;
  batchNumber?: string;
  serialId?: string;
  category: AlertCategory;
  timestamp: string;
  severity: AlertSeverity;
  riskScore: number;
  evidenceUrl?: string;
}

export interface GroupingDecision {
  targetCase: InvestigationCase;
  isNewCase: boolean;
  isDuplicateSuppressed: boolean;
  shouldNotifyStakeholder: boolean;
  severityEscalated: boolean;
}

// Configurable grouping time window (default 24 hours in milliseconds)
export const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Intelligent Case Grouping & Duplicate Suppression Engine.
 * Correlates raw alerts into cohesive investigation cases, suppresses duplicate
 * alert spam, increments occurrence counts, and escalates risk on repeated events.
 */
export function groupAlertIntoCase(
  candidate: GroupingCandidate,
  existingCases: InvestigationCase[],
  allAlertsForOrg?: Alert[]
): GroupingDecision {
  const eventTime = new Date(candidate.timestamp).getTime();

  // Find candidate existing case that is currently active (not RESOLVED or CLOSED)
  const matchingCase = existingCases.find((c) => {
    if (c.status === 'RESOLVED' || c.status === 'CLOSED') return false;

    const caseLastTime = new Date(c.last_detected_at).getTime();
    if (eventTime - caseLastTime > GROUPING_WINDOW_MS) return false;

    // 1. For batch-specific identity and shelf-life events, match the exact batch
    if (['DESTROYED_REENTRY', 'QR_SERIAL_MISMATCH', 'DUPLICATE_SERIAL', 'EXPIRY'].includes(candidate.category)) {
      if (candidate.batchNumber && c.affected_batches.includes(candidate.batchNumber)) {
        return true;
      }
      if (candidate.serialId && c.affected_serials?.includes(candidate.serialId)) {
        return true;
      }
      return false;
    }

    // 2. Same batch number and category
    if (candidate.batchNumber && c.affected_batches.includes(candidate.batchNumber) && c.category === candidate.category) {
      return true;
    }

    // 3. Same duplicate serial identity
    if (candidate.serialId && c.affected_serials?.includes(candidate.serialId)) {
      return true;
    }

    // 4. Same organization and same operational category on the same batch or general chain
    if (candidate.batchNumber && c.affected_batches.includes(candidate.batchNumber)) {
      return true;
    }

    return false;
  });

  if (matchingCase) {
    // Existing Case Found -> Duplicate Suppression & Frequency Escalation
    const previousSeverity = matchingCase.severity;
    matchingCase.occurrence_count += 1;
    matchingCase.last_detected_at = candidate.timestamp;
    matchingCase.updated_at = candidate.timestamp;

    if (candidate.batchNumber && !matchingCase.affected_batches.includes(candidate.batchNumber)) {
      matchingCase.affected_batches.push(candidate.batchNumber);
    }
    if (candidate.serialId && (!matchingCase.affected_serials || !matchingCase.affected_serials.includes(candidate.serialId))) {
      matchingCase.affected_serials = matchingCase.affected_serials || [];
      matchingCase.affected_serials.push(candidate.serialId);
    }
    if (candidate.alert.id && !matchingCase.related_alert_ids.includes(candidate.alert.id)) {
      matchingCase.related_alert_ids.push(candidate.alert.id);
    }

    // Re-evaluate priority using escalated occurrence count
    const reEval = evaluatePriority({
      category: matchingCase.category,
      isDestroyedReentry: matchingCase.category === 'DESTROYED_REENTRY',
      isDuplicateSerial: matchingCase.category === 'DUPLICATE_SERIAL',
      isExpiredSaleAttempt: matchingCase.category === 'EXPIRY',
      isQrMismatch: matchingCase.category === 'QR_SERIAL_MISMATCH',
      isUnauthorizedOrg: matchingCase.category === 'UNAUTHORIZED_CUSTODY',
      isCertificateAnomaly: matchingCase.category === 'CERTIFICATE_ANOMALY',
      hasQuantityDiscrepancy: matchingCase.category === 'QUANTITY_DISCREPANCY' || matchingCase.category === 'RETURN_DISCREPANCY',
      occurrenceCount: matchingCase.occurrence_count,
      previousViolationsCount: allAlertsForOrg
        ? allAlertsForOrg.filter(
            (a) => a.severity === 'HIGH' || a.severity === 'CRITICAL' || a.category === 'DESTROYED_REENTRY' || a.category === 'DUPLICATE_SERIAL' || a.category === 'UNAUTHORIZED_CUSTODY'
          ).length
        : 0,
    });

    matchingCase.risk_score = Math.max(matchingCase.risk_score, reEval.riskScore);
    matchingCase.severity = reEval.severity;
    if (reEval.escalationLevel !== 'NONE') {
      matchingCase.escalation_level = reEval.escalationLevel;
    }

    // Check if severity escalated
    const severityRank: Record<AlertSeverity, number> = {
      LOW: 1,
      WARNING: 2,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    const severityEscalated = severityRank[matchingCase.severity] > severityRank[previousSeverity];

    // If case has repeated occurrences without resolution, escalate status
    if (matchingCase.occurrence_count >= 3 && matchingCase.status === 'OPEN') {
      matchingCase.status = 'ACTION_REQUIRED';
    }
    if (severityEscalated || matchingCase.severity === 'CRITICAL') {
      matchingCase.status = 'ESCALATED';
    }

    // Append timeline entry
    matchingCase.timeline.push({
      id: `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: candidate.timestamp,
      title: `Repeated Occurrence #${matchingCase.occurrence_count}`,
      description: `${candidate.alert.reason} (Batch: ${candidate.batchNumber || 'N/A'})`,
      actor: candidate.alert.detected_actor || 'System Monitor',
      severity: candidate.severity,
    });

    // Notify only if severity escalated or at critical milestones (1st was already notified, notify on 5th, 20th, etc.)
    const shouldNotifyStakeholder = severityEscalated || matchingCase.occurrence_count === 5 || matchingCase.occurrence_count === 20;

    return {
      targetCase: matchingCase,
      isNewCase: false,
      isDuplicateSuppressed: true,
      shouldNotifyStakeholder,
      severityEscalated,
    };
  }

  // Create New Investigation Case
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const caseId = `CASE-${year}-${randomSuffix}`;
  const caseNumber = `MT-${year}-${randomSuffix}`;

  // Default assigned stakeholder based on category
  let defaultStakeholder: StakeholderRole = 'distributor';
  if (candidate.category === 'EXPIRY') defaultStakeholder = 'retailer';
  else if (candidate.category === 'DESTROYED_REENTRY' || candidate.severity === 'CRITICAL') defaultStakeholder = 'regulator';
  else if (candidate.category === 'DESTRUCTION' || candidate.category === 'CERTIFICATE_ANOMALY') defaultStakeholder = 'manufacturer';
  else if (candidate.category === 'QUANTITY_DISCREPANCY') defaultStakeholder = 'distributor';

  // Generate recommended action
  let recommendedAction = 'Investigate physical custody and cross-reference batch logs.';
  if (candidate.category === 'DESTROYED_REENTRY') {
    recommendedAction = 'IMMEDIATE ACTION: Block physical sale, quarantine stock, and dispatch regulatory inspector.';
  } else if (candidate.category === 'DUPLICATE_SERIAL') {
    recommendedAction = 'Quarantine duplicate units across both facilities and verify manufacturer holographic serial seal.';
  } else if (candidate.category === 'EXPIRY') {
    recommendedAction = 'Quarantine expired stock in retailer return bay and initiate reverse logistics pickup.';
  } else if (candidate.category === 'QUANTITY_DISCREPANCY') {
    recommendedAction = 'Reconcile physical delivery count between retailer claim and distributor manifest.';
  }

  const newCase: InvestigationCase = {
    id: caseId,
    case_number: caseNumber,
    title: generateCaseTitle(candidate),
    category: candidate.category,
    severity: candidate.severity,
    risk_score: candidate.riskScore,
    primary_organization_id: candidate.organizationId,
    status: candidate.severity === 'CRITICAL' ? 'ESCALATED' : 'OPEN',
    first_detected_at: candidate.timestamp,
    last_detected_at: candidate.timestamp,
    occurrence_count: 1,
    escalation_level: candidate.severity === 'CRITICAL' ? 'REGULATOR' : (candidate.severity === 'HIGH' ? 'COMPLIANCE' : 'ORG_LEVEL'),
    assigned_stakeholder: candidate.alert.assigned_stakeholder || defaultStakeholder,
    assigned_org_id: candidate.organizationId,
    affected_batches: candidate.batchNumber ? [candidate.batchNumber] : [],
    affected_serials: candidate.serialId ? [candidate.serialId] : [],
    related_alert_ids: candidate.alert.id ? [candidate.alert.id] : [],
    recommended_action: recommendedAction,
    timeline: [
      {
        id: `TL-${Date.now()}-1`,
        timestamp: candidate.timestamp,
        title: 'Initial Incident Detected',
        description: candidate.alert.reason,
        actor: candidate.alert.detected_actor || 'System Surveillance',
        severity: candidate.severity,
      },
    ],
    created_at: candidate.timestamp,
    updated_at: candidate.timestamp,
  };

  return {
    targetCase: newCase,
    isNewCase: true,
    isDuplicateSuppressed: false,
    shouldNotifyStakeholder: true,
    severityEscalated: false,
  };
}

function generateCaseTitle(candidate: GroupingCandidate): string {
  switch (candidate.category) {
    case 'DESTROYED_REENTRY':
      return `CRITICAL: Destroyed Batch Re-entry (${candidate.batchNumber || 'Batch'})`;
    case 'DUPLICATE_SERIAL':
      return `CRITICAL: Duplicate Serial Collision (${candidate.serialId || 'Serial'})`;
    case 'QR_SERIAL_MISMATCH':
      return `IDENTITY CONFLICT: QR Token & Serial Mismatch (${candidate.batchNumber || 'Batch'})`;
    case 'EXPIRY':
      return `COMPLIANCE: Expired Medicine Dispense Attempt (${candidate.batchNumber || 'Batch'})`;
    case 'QUANTITY_DISCREPANCY':
    case 'RETURN_DISCREPANCY':
      return `CUSTODY DISPUTE: Quantity Discrepancy (${candidate.batchNumber || 'Batch'})`;
    case 'UNAUTHORIZED_CUSTODY':
      return `CHAIN BREACH: Unauthorized Custody Attempt (${candidate.batchNumber || 'Batch'})`;
    case 'CERTIFICATE_ANOMALY':
      return `REGULATORY BREACH: Certificate Inconsistency (${candidate.batchNumber || 'Batch'})`;
    default:
      return `COMPLIANCE INCIDENT: ${candidate.category} (${candidate.batchNumber || 'Batch'})`;
  }
}
