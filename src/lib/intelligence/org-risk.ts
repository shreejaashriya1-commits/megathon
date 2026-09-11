import { AlertSeverity, InvestigationCase, Org, OrganizationRiskProfile } from '@/../types/database';

/**
 * Calculates organization-level risk scores and risk profiles across all entities.
 * Designed strictly as an investigation-prioritization tool for regulators and compliance officers.
 */
export function calculateOrganizationRiskProfiles(
  orgs: Org[],
  cases: InvestigationCase[]
): OrganizationRiskProfile[] {
  return orgs.map((org) => {
    const orgCases = cases.filter((c) => c.primary_organization_id === org.id);
    const totalCases = orgCases.length;
    const openCases = orgCases.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length;

    let discrepancyCount = 0;
    let unauthorizedCustodyCount = 0;
    let duplicateSerialCount = 0;
    let destroyedReentryCount = 0;

    for (const c of orgCases) {
      if (c.category === 'QUANTITY_DISCREPANCY' || c.category === 'RETURN_DISCREPANCY') {
        discrepancyCount += c.occurrence_count || 1;
      }
      if (c.category === 'UNAUTHORIZED_CUSTODY') {
        unauthorizedCustodyCount += c.occurrence_count || 1;
      }
      if (c.category === 'DUPLICATE_SERIAL') {
        duplicateSerialCount += c.occurrence_count || 1;
      }
      if (c.category === 'DESTROYED_REENTRY') {
        destroyedReentryCount += c.occurrence_count || 1;
      }
    }

    const riskFactors: string[] = [];

    // Weighted risk calculation:
    // Base: open cases * 10
    // Discrepancies: * 5
    // Unauthorized custody: * 15
    // Duplicate serial: * 20
    // Destroyed re-entry: * 30
    let rawScore = (
      openCases * 12 +
      discrepancyCount * 5 +
      unauthorizedCustodyCount * 15 +
      duplicateSerialCount * 20 +
      destroyedReentryCount * 30
    );

    if (destroyedReentryCount > 0) {
      riskFactors.push(`${destroyedReentryCount} destroyed medicine re-entry breach(es)`);
    }
    if (duplicateSerialCount > 0) {
      riskFactors.push(`${duplicateSerialCount} duplicate serial collision(s)`);
    }
    if (discrepancyCount > 0) {
      riskFactors.push(`${discrepancyCount} physical quantity discrepancy event(s)`);
    }
    if (unauthorizedCustodyCount > 0) {
      riskFactors.push(`${unauthorizedCustodyCount} unauthorized custody attempt(s)`);
    }
    if (openCases > 0) {
      riskFactors.push(`${openCases} unresolved investigation case(s)`);
    }

    if (riskFactors.length === 0) {
      riskFactors.push('Full compliance history; zero suspicious incidents recorded.');
    }

    const riskScore = Math.min(100, Math.max(0, rawScore));

    let riskTier: AlertSeverity = 'LOW';
    if (riskScore >= 70) {
      riskTier = 'CRITICAL';
    } else if (riskScore >= 50) {
      riskTier = 'HIGH';
    } else if (riskScore >= 30) {
      riskTier = 'MEDIUM';
    } else {
      riskTier = 'LOW';
    }

    return {
      org_id: org.id,
      org_name: org.name,
      role: org.role,
      total_cases: totalCases,
      open_cases: openCases,
      discrepancy_count: discrepancyCount,
      unauthorized_custody_count: unauthorizedCustodyCount,
      duplicate_serial_count: duplicateSerialCount,
      risk_score: riskScore,
      risk_tier: riskTier,
      last_evaluated_at: new Date().toISOString(),
      risk_factors: riskFactors,
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
}
