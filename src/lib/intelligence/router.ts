import {
  Alert,
  AlertCategory,
  AlertSeverity,
  InvestigationCase,
  Notification,
  Org,
  StakeholderRole,
} from '@/../types/database';

export interface RouteTarget {
  role: StakeholderRole;
  orgId?: number | null;
  priority: AlertSeverity;
  isRegulatorEscalation: boolean;
}

export interface RoutingContext {
  caseData: InvestigationCase;
  alert: Alert;
  organization?: Org | null;
  counterpartyOrg?: Org | null;
  manufacturerOrg?: Org | null;
  retailerOrg?: Org | null;
  distributorOrg?: Org | null;
}

/**
 * Determines which stakeholders receive notifications based on issue category,
 * severity, and strict regulator filtering rules.
 */
export function determineStakeholderRouting(ctx: RoutingContext): RouteTarget[] {
  const { caseData, alert } = ctx;
  const targets: RouteTarget[] = [];
  const category = caseData.category;
  const severity = caseData.severity;
  const isHighOrCritical = severity === 'HIGH' || severity === 'CRITICAL';
  const isRepeated = caseData.occurrence_count >= 3;

  switch (category) {
    case 'EXPIRY':
      // Operational issue -> Retailer
      targets.push({
        role: 'retailer',
        orgId: alert.attempted_by_org_id || caseData.primary_organization_id,
        priority: severity,
        isRegulatorEscalation: false,
      });
      // Only escalate to regulator if repeated expired medicine attempted for sale
      if (isRepeated && isHighOrCritical) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: 'HIGH',
          isRegulatorEscalation: true,
        });
      }
      break;

    case 'QUANTITY_DISCREPANCY':
    case 'RETURN_DISCREPANCY':
      // Operational custody dispute -> Distributor + Retailer
      if (ctx.distributorOrg) {
        targets.push({
          role: 'distributor',
          orgId: ctx.distributorOrg.id,
          priority: severity,
          isRegulatorEscalation: false,
        });
      }
      if (ctx.retailerOrg) {
        targets.push({
          role: 'retailer',
          orgId: ctx.retailerOrg.id,
          priority: severity,
          isRegulatorEscalation: false,
        });
      }
      // Regulator ONLY receives this if repeated unresolved or escalated to HIGH/CRITICAL!
      if (isHighOrCritical || caseData.escalation_level === 'REGULATOR' || (isRepeated && severity !== 'LOW')) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: severity,
          isRegulatorEscalation: true,
        });
      }
      break;

    case 'DESTRUCTION':
    case 'CERTIFICATE_ANOMALY':
      // Manufacturer + Waste Facility
      if (ctx.manufacturerOrg) {
        targets.push({
          role: 'manufacturer',
          orgId: ctx.manufacturerOrg.id,
          priority: severity,
          isRegulatorEscalation: false,
        });
      }
      targets.push({
        role: 'waste_facility',
        orgId: null,
        priority: severity,
        isRegulatorEscalation: false,
      });
      if (isHighOrCritical) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: severity,
          isRegulatorEscalation: true,
        });
      }
      break;

    case 'DESTROYED_REENTRY':
      // IMMEDIATE CRITICAL: Regulator + Manufacturer + Detecting Organization
      targets.push({
        role: 'regulator',
        orgId: 6,
        priority: 'CRITICAL',
        isRegulatorEscalation: true,
      });
      if (ctx.manufacturerOrg) {
        targets.push({
          role: 'manufacturer',
          orgId: ctx.manufacturerOrg.id,
          priority: 'CRITICAL',
          isRegulatorEscalation: false,
        });
      }
      targets.push({
        role: 'retailer',
        orgId: alert.attempted_by_org_id || caseData.primary_organization_id,
        priority: 'CRITICAL',
        isRegulatorEscalation: false,
      });
      break;

    case 'DUPLICATE_SERIAL':
      // CRITICAL: Manufacturer + Detecting Org + Regulator if HIGH/CRITICAL
      if (ctx.manufacturerOrg) {
        targets.push({
          role: 'manufacturer',
          orgId: ctx.manufacturerOrg.id,
          priority: 'CRITICAL',
          isRegulatorEscalation: false,
        });
      }
      targets.push({
        role: 'retailer',
        orgId: alert.attempted_by_org_id || caseData.primary_organization_id,
        priority: 'CRITICAL',
        isRegulatorEscalation: false,
      });
      if (isHighOrCritical) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: 'CRITICAL',
          isRegulatorEscalation: true,
        });
      }
      break;

    case 'QR_SERIAL_MISMATCH':
      // Detecting Org + Manufacturer + Regulator if repeated/high
      targets.push({
        role: 'retailer',
        orgId: alert.attempted_by_org_id || caseData.primary_organization_id,
        priority: severity,
        isRegulatorEscalation: false,
      });
      if (ctx.manufacturerOrg) {
        targets.push({
          role: 'manufacturer',
          orgId: ctx.manufacturerOrg.id,
          priority: severity,
          isRegulatorEscalation: false,
        });
      }
      if (isHighOrCritical || isRepeated) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: 'HIGH',
          isRegulatorEscalation: true,
        });
      }
      break;

    case 'UNAUTHORIZED_CUSTODY':
    case 'UNEXPECTED_MOVEMENT':
      // Authorized holder + Upstream Org -> Regulator only after escalation threshold
      if (ctx.distributorOrg) {
        targets.push({
          role: 'distributor',
          orgId: ctx.distributorOrg.id,
          priority: severity,
          isRegulatorEscalation: false,
        });
      }
      targets.push({
        role: 'retailer',
        orgId: alert.attempted_by_org_id || caseData.primary_organization_id,
        priority: severity,
        isRegulatorEscalation: false,
      });
      if (isHighOrCritical && (isRepeated || caseData.escalation_level === 'REGULATOR')) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: 'HIGH',
          isRegulatorEscalation: true,
        });
      }
      break;

    default:
      // Default: Responsible Org only
      targets.push({
        role: 'distributor',
        orgId: caseData.primary_organization_id,
        priority: severity,
        isRegulatorEscalation: false,
      });
      if (isHighOrCritical) {
        targets.push({
          role: 'regulator',
          orgId: 6,
          priority: severity,
          isRegulatorEscalation: true,
        });
      }
      break;
  }

  // Deduplicate targets by role and orgId
  const uniqueTargets: RouteTarget[] = [];
  for (const t of targets) {
    const exists = uniqueTargets.some((u) => u.role === t.role && u.orgId === t.orgId);
    if (!exists) uniqueTargets.push(t);
  }

  return uniqueTargets;
}

/**
 * Generates structured, actionable notifications conforming to Section 12:
 * WHAT happened, WHERE, WHEN, WHY it matters, WHO must act, WHAT action is recommended.
 */
export function buildSmartNotificationMessage(
  target: RouteTarget,
  ctx: RoutingContext
): { title: string; message: string } {
  const { caseData, alert, organization } = ctx;
  const batchStr = caseData.affected_batches.join(', ') || 'N/A';
  const orgName = organization?.name || `Organization #${caseData.primary_organization_id}`;
  const whenStr = new Date(caseData.last_detected_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (caseData.category === 'DESTROYED_REENTRY') {
    return {
      title: `CRITICAL: Destroyed Batch Re-entry Detected (${batchStr})`,
      message:
        `WHAT: Attempted transaction of permanently DESTROYED pharmaceutical stock. ` +
        `WHERE: Detected at ${orgName}. ` +
        `WHEN: ${whenStr}. ` +
        `WHY IT MATTERS: High safety risk: product was permanently incinerated and registered as destroyed; re-appearance indicates counterfeit or diversion breach. ` +
        `WHO MUST ACT: ${target.role.toUpperCase()} Compliance Officer. ` +
        `RECOMMENDED ACTION: Block sale immediately, quarantine physical units, and preserve QR code for regulatory forensic audit.`,
    };
  }

  if (caseData.category === 'QUANTITY_DISCREPANCY' || caseData.category === 'RETURN_DISCREPANCY') {
    const isHigh = caseData.severity === 'HIGH' || caseData.severity === 'CRITICAL';
    return {
      title: `${isHigh ? 'HIGH RISK' : 'OPERATIONAL'}: Custody Quantity Mismatch (${batchStr})`,
      message:
        `WHAT: Physical count discrepancy identified during reverse chain transfer. ` +
        `WHERE: Logged between ${orgName} and logistics counterparty. ` +
        `WHEN: ${whenStr}. ` +
        `WHY IT MATTERS: ${caseData.occurrence_count > 1 ? `Repeated discrepancy (${caseData.occurrence_count} times). Potential inventory leakage or transit diversion.` : 'Unit count discrepancy requires reconciliation before custody release.'} ` +
        `WHO MUST ACT: ${target.role.toUpperCase()} Logistics & Compliance Lead. ` +
        `RECOMMENDED ACTION: Perform recount and update digital pickup ledger to resolve custody dispute.`,
    };
  }

  if (caseData.category === 'DUPLICATE_SERIAL') {
    return {
      title: `CRITICAL: Duplicate Unique Serial Detected (${batchStr})`,
      message:
        `WHAT: Identical unique serial token scanned at two distinct physical locations. ` +
        `WHERE: Scanned at ${orgName}. ` +
        `WHEN: ${whenStr}. ` +
        `WHY IT MATTERS: Serial uniqueness violated; strong indicator of cloned secondary packaging or counterfeit labeling. ` +
        `WHO MUST ACT: Manufacturer Security Team & ${target.role.toUpperCase()}. ` +
        `RECOMMENDED ACTION: Halt distribution of affected serials and initiate serial reconciliation.`,
    };
  }

  if (caseData.category === 'EXPIRY') {
    return {
      title: `COMPLIANCE WARNING: Expired Medicine Dispense Attempt (${batchStr})`,
      message:
        `WHAT: Expired medicine batch presented for retail sale or transfer. ` +
        `WHERE: ${orgName}. ` +
        `WHEN: ${whenStr}. ` +
        `WHY IT MATTERS: Dispensing expired drugs violates Drugs and Cosmetics Act safety standards. ` +
        `WHO MUST ACT: Retail Pharmacist & Inventory Lead. ` +
        `RECOMMENDED ACTION: Move batch immediately to quarantine return bay and initiate return request.`,
    };
  }

  return {
    title: `Compliance Incident [${caseData.severity}]: ${caseData.title}`,
    message:
      `WHAT: ${caseData.title}. ` +
      `WHERE: ${orgName}. ` +
      `WHEN: ${whenStr}. ` +
      `WHY IT MATTERS: Risk score ${caseData.risk_score}/100. ${caseData.occurrence_count} related event(s) logged. ` +
      `WHO MUST ACT: ${target.role.toUpperCase()}. ` +
      `RECOMMENDED ACTION: ${caseData.recommended_action}`,
  };
}
