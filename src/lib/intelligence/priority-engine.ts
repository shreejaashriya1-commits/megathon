import { AlertCategory, AlertSeverity, EscalationLevel } from '@/../types/database';

export interface PrioritySignal {
  code: string;
  label: string;
  points: number;
}

export interface PriorityEvaluationInput {
  category: AlertCategory;
  isDestroyedReentry?: boolean;
  isDuplicateSerial?: boolean;
  isExpiredSaleAttempt?: boolean;
  isQrMismatch?: boolean;
  isUnauthorizedOrg?: boolean;
  isCertificateAnomaly?: boolean;
  isUnexpectedLocation?: boolean;
  hasQuantityDiscrepancy?: boolean;
  discrepancyPercentage?: number;
  occurrenceCount?: number;
  previousViolationsCount?: number;
  unresolvedDays?: number;
}

export interface PriorityEvaluationResult {
  riskScore: number;
  severity: AlertSeverity;
  escalationLevel: EscalationLevel;
  signals: PrioritySignal[];
  isImmediateCritical: boolean;
  explanation: string;
}

// Configurable weights as per Specification Section 4
export const SIGNAL_WEIGHTS = {
  DESTROYED_IDENTITY_REAPPEARED: 50,
  DUPLICATE_SERIAL: 40,
  EXPIRED_MEDICINE_SALE_ATTEMPT: 40,
  QR_SERIAL_MISMATCH: 30,
  UNAUTHORIZED_ORGANIZATION: 30,
  CERTIFICATE_INCONSISTENCY: 30,
  UNEXPECTED_LOCATION_HOLDER: 25,
  QUANTITY_DISCREPANCY: 20,
  REPEATED_SUSPICIOUS_EVENT: 20,
  PREVIOUS_VIOLATION_INCREMENT: 10,
};

// Configurable severity thresholds
export const SEVERITY_THRESHOLDS = {
  LOW_MAX: 29,
  MEDIUM_MAX: 49,
  HIGH_MAX: 69,
  CRITICAL_MIN: 70,
};

/**
 * Deterministic Priority and Risk Engine.
 * Evaluates safety-critical signals, computes explainable risk score (0-100),
 * and determines required escalation level.
 */
export function evaluatePriority(input: PriorityEvaluationInput): PriorityEvaluationResult {
  const signals: PrioritySignal[] = [];
  let isImmediateCritical = false;

  // Immediate Hard Critical Safety Triggers
  if (input.isDestroyedReentry || input.category === 'DESTROYED_REENTRY') {
    isImmediateCritical = true;
    signals.push({
      code: 'DESTROYED_REENTRY',
      label: 'Destroyed medicine identity reappeared in active circulation',
      points: SIGNAL_WEIGHTS.DESTROYED_IDENTITY_REAPPEARED,
    });
  }

  if (input.isDuplicateSerial || input.category === 'DUPLICATE_SERIAL') {
    isImmediateCritical = true;
    signals.push({
      code: 'DUPLICATE_SERIAL',
      label: 'Duplicate unique product serial detected across distinct facilities',
      points: SIGNAL_WEIGHTS.DUPLICATE_SERIAL,
    });
  }

  if (input.isExpiredSaleAttempt || input.category === 'EXPIRY') {
    signals.push({
      code: 'EXPIRED_SALE_ATTEMPT',
      label: 'Expired pharmaceutical stock attempted for patient sale',
      points: SIGNAL_WEIGHTS.EXPIRED_MEDICINE_SALE_ATTEMPT,
    });
  }

  if (input.isQrMismatch || input.category === 'QR_SERIAL_MISMATCH') {
    signals.push({
      code: 'QR_SERIAL_MISMATCH',
      label: 'Physical QR token / serial mismatch with batch ledger',
      points: SIGNAL_WEIGHTS.QR_SERIAL_MISMATCH,
    });
  }

  if (input.isUnauthorizedOrg || input.category === 'UNAUTHORIZED_CUSTODY') {
    signals.push({
      code: 'UNAUTHORIZED_ORGANIZATION',
      label: 'Unauthorized organization attempting custody transfer',
      points: SIGNAL_WEIGHTS.UNAUTHORIZED_ORGANIZATION,
    });
  }

  if (input.isCertificateAnomaly || input.category === 'CERTIFICATE_ANOMALY') {
    signals.push({
      code: 'CERTIFICATE_INCONSISTENCY',
      label: 'Destruction certificate missing, invalid, or re-issued illegally',
      points: SIGNAL_WEIGHTS.CERTIFICATE_INCONSISTENCY,
    });
  }

  if (input.isUnexpectedLocation || input.category === 'UNEXPECTED_MOVEMENT') {
    signals.push({
      code: 'UNEXPECTED_LOCATION',
      label: 'Movement detected outside authorized supply chain route',
      points: SIGNAL_WEIGHTS.UNEXPECTED_LOCATION_HOLDER,
    });
  }

  if (input.hasQuantityDiscrepancy || input.category === 'QUANTITY_DISCREPANCY' || input.category === 'RETURN_DISCREPANCY') {
    const isLarge = (input.discrepancyPercentage || 0) > 10;
    signals.push({
      code: 'QUANTITY_DISCREPANCY',
      label: `Physical count mismatch (${input.discrepancyPercentage ? input.discrepancyPercentage + '%' : 'disputed quantity'})`,
      points: isLarge ? SIGNAL_WEIGHTS.QUANTITY_DISCREPANCY + 10 : SIGNAL_WEIGHTS.QUANTITY_DISCREPANCY,
    });
  }

  // Frequency escalation: repeated occurrences (+20 per repeated event cluster)
  const count = input.occurrenceCount || 1;
  if (count > 1) {
    const repeatPoints = Math.min(40, (count - 1) * SIGNAL_WEIGHTS.REPEATED_SUSPICIOUS_EVENT);
    signals.push({
      code: 'REPEATED_SUSPICIOUS_EVENT',
      label: `Repeated event pattern detected (${count} related occurrences)`,
      points: repeatPoints,
    });
  }

  // Previous violation history (+10 per historical violation up to 30)
  const prevViolations = input.previousViolationsCount || 0;
  if (prevViolations > 0) {
    const historyPoints = Math.min(30, prevViolations * SIGNAL_WEIGHTS.PREVIOUS_VIOLATION_INCREMENT);
    signals.push({
      code: 'PREVIOUS_ORGANIZATION_VIOLATIONS',
      label: `Organization has ${prevViolations} previous recorded compliance violations`,
      points: historyPoints,
    });
  }

  // Total raw score
  let rawScore = signals.reduce((sum, s) => sum + s.points, 0);

  // Mandatory Safety Overrides as per Specification Phase 4:
  // 1. DESTROYED_REENTRY: Risk >= 95, Priority = CRITICAL
  if (input.isDestroyedReentry || input.category === 'DESTROYED_REENTRY') {
    rawScore = Math.max(rawScore, 95);
    isImmediateCritical = true;
  } else if (input.isDuplicateSerial || input.category === 'DUPLICATE_SERIAL') {
    // 2. DUPLICATE_SERIAL: Risk >= 90, Priority = CRITICAL
    rawScore = Math.max(rawScore, 90);
    isImmediateCritical = true;
  } else if (isImmediateCritical) {
    rawScore = Math.max(rawScore, 90);
  }

  // 3. Clean single-unit discrepancy with no prior violations must remain LOW (<= 30)
  if (
    (input.category === 'QUANTITY_DISCREPANCY' || input.category === 'RETURN_DISCREPANCY') &&
    !isImmediateCritical &&
    prevViolations === 0 &&
    count <= 1
  ) {
    rawScore = Math.min(rawScore, 25);
  }

  const riskScore = Math.min(100, Math.max(0, rawScore));

  // Determine severity tier
  let severity: AlertSeverity = 'LOW';
  if (riskScore >= SEVERITY_THRESHOLDS.CRITICAL_MIN || isImmediateCritical) {
    severity = 'CRITICAL';
  } else if (riskScore > SEVERITY_THRESHOLDS.MEDIUM_MAX) {
    severity = 'HIGH';
  } else if (riskScore > SEVERITY_THRESHOLDS.LOW_MAX) {
    severity = 'MEDIUM';
  } else {
    severity = 'LOW';
  }

  // Determine escalation level
  let escalationLevel: EscalationLevel = 'NONE';
  if (severity === 'CRITICAL') {
    escalationLevel = 'REGULATOR';
  } else if (severity === 'HIGH') {
    escalationLevel = count >= 3 || prevViolations >= 2 ? 'REGULATOR' : 'COMPLIANCE';
  } else if (severity === 'MEDIUM') {
    escalationLevel = count >= 3 ? 'COMPLIANCE' : 'ORG_LEVEL';
  } else {
    escalationLevel = 'ORG_LEVEL';
  }

  // Generate concise human-readable explanation
  const explanation = signals.length > 0
    ? `Risk score ${riskScore}/100 (${severity}) determined by: ` +
      signals.map((s) => `${s.label} (+${s.points})`).join('; ')
    : `Baseline operational transaction (Risk: ${riskScore}/100)`;

  return {
    riskScore,
    severity,
    escalationLevel,
    signals,
    isImmediateCritical,
    explanation,
  };
}
