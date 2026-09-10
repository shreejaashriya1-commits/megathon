import { RawEvent } from '@/../types/database';
import { processEvent } from './event-processor';

export interface SimulationResult {
  totalRawEvents: number;
  normalEventsCount: number;
  suspiciousEventsCount: number;
  alertsCreatedCount: number;
  casesCreatedCount: number;
  casesGroupedCount: number;
  duplicateAlertsSuppressedCount: number;
  regulatorActionableCasesCount: number;
  casesBySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  notificationsByRole: {
    retailer: number;
    distributor: number;
    manufacturer: number;
    waste_facility: number;
    regulator: number;
  };
  summaryMessage: string;
}

/**
 * High-Volume Event Intelligence Simulator (Section 21 & Section 22).
 * Simulates 1,000+ realistic pharmaceutical reverse-chain transactions
 * demonstrating the entire funnel:
 * 1,000+ events -> classified -> deduplicated -> grouped -> risk scored ->
 * routed -> only high/critical escalated to regulator.
 */
export async function runScalableSimulation(totalTarget: number = 1000): Promise<SimulationResult> {
  const events: RawEvent[] = [];
  const baseTime = new Date('2026-09-10T08:00:00Z').getTime();

  // 1. Normal Transactions (~750 events) -> Should generate ZERO alerts/cases
  const normalCount = Math.floor(totalTarget * 0.75); // ~750
  for (let i = 0; i < normalCount; i++) {
    const t = new Date(baseTime + i * 30 * 1000).toISOString();
    events.push({
      id: `SIM-NORM-${i + 1}`,
      event_type: i % 3 === 0 ? 'NORMAL_SALE' : (i % 3 === 1 ? 'LOOKUP_ALLOWED' : 'PICKUP_CONFIRMED'),
      timestamp: t,
      batch_number: i % 2 === 0 ? 'AZI-2026-088' : 'MET-2026-045',
      actor_org_id: (i % 3) + 1, // Apollo, City Medicos, Sunrise
      location: 'Authorized Counter Dispense',
    });
  }

  // 2. 1-unit Minor Quantity Mismatches (~60 events) -> Low operational alert -> Distributor + Retailer, NO regulator
  for (let i = 0; i < 60; i++) {
    const t = new Date(baseTime + 1000000 + i * 60 * 1000).toISOString();
    events.push({
      id: `SIM-DISC-1U-${i + 1}`,
      event_type: 'PICKUP_DISPUTED',
      timestamp: t,
      batch_number: `ROUTINE-ATO-${i + 1}`,
      actor_org_id: 4, // MedLine Distributors
      target_org_id: (i % 3) + 1, // Retailers
      claimed_quantity: 100,
      received_quantity: 99, // Exactly 1 unit mismatch
      location: 'Bhiwandi Central Logistics Hub',
    });
  }

  // 3. Repeated Quantity Mismatches at MedLine Distributors (~40 events) -> Risk increases -> Escalates to HIGH case
  for (let i = 0; i < 40; i++) {
    const t = new Date(baseTime + 2000000 + i * 120 * 1000).toISOString();
    events.push({
      id: `SIM-DISC-REP-${i + 1}`,
      event_type: 'PICKUP_DISPUTED',
      timestamp: t,
      batch_number: 'PCM-DISPUTED-BATCH',
      actor_org_id: 4, // MedLine
      target_org_id: 2, // City Medicos
      claimed_quantity: 80,
      received_quantity: 65, // 15 units mismatch
      location: 'Bhiwandi Central Logistics Hub',
    });
  }

  // 4. Expired Stock Dispense Attempts (~50 events) -> Retailer Operational
  for (let i = 0; i < 50; i++) {
    const t = new Date(baseTime + 3000000 + i * 90 * 1000).toISOString();
    events.push({
      id: `SIM-EXP-${i + 1}`,
      event_type: 'EXPIRY_DISPENSE',
      timestamp: t,
      batch_number: `PCM-EXP-${(i % 15) + 1}`,
      actor_org_id: (i % 3) + 1,
      location: 'Pharmacy Point of Sale',
    });
  }

  // 5. Unauthorized Custody Attempts (~30 events) -> Authorized holder + Upstream org
  for (let i = 0; i < 30; i++) {
    const t = new Date(baseTime + 4000000 + i * 150 * 1000).toISOString();
    events.push({
      id: `SIM-UNAUTH-${i + 1}`,
      event_type: 'UNAUTHORIZED_CUSTODY',
      timestamp: t,
      batch_number: 'CM-AMX-2026',
      actor_org_id: 3, // Sunrise Pharmacy attempting to claim City Medicos batch
      location: 'Unregistered Intake Dock',
    });
  }

  // 6. QR / Identity Mismatches (~25 events)
  for (let i = 0; i < 25; i++) {
    const t = new Date(baseTime + 5000000 + i * 180 * 1000).toISOString();
    events.push({
      id: `SIM-QRMIS-${i + 1}`,
      event_type: 'QR_SERIAL_MISMATCH',
      timestamp: t,
      batch_number: 'AZI-2026-088',
      serial_id: `SN-CLONE-${i + 1}`,
      actor_org_id: 2,
      location: 'Verification Scanner Unit',
    });
  }

  // 7. Same Destroyed Batch Scanned 20 times in a burst! (Section 21 Test 6)
  // Batch AMX-DEMO-001 scanned 20 times in 10 minutes -> Deduplicated into 1 Case (occurrence_count = 20, 1 regulator notif)
  for (let i = 0; i < 20; i++) {
    const t = new Date(baseTime + 6000000 + i * 30 * 1000).toISOString(); // Every 30s
    events.push({
      id: `SIM-AMX-BURST-${i + 1}`,
      event_type: 'SALE_BLOCKED_DESTROYED',
      timestamp: t,
      batch_number: 'AMX-DEMO-001',
      actor_org_id: 1, // Apollo Pharmacy
      location: 'Checkout Terminal 2',
    });
  }

  // 8. 5 other individual destroyed re-entry attempts
  for (let i = 0; i < 5; i++) {
    const t = new Date(baseTime + 6500000 + i * 120 * 1000).toISOString();
    events.push({
      id: `SIM-AMX-OTHER-${i + 1}`,
      event_type: 'SALE_BLOCKED_DESTROYED',
      timestamp: t,
      batch_number: 'AMX-DEMO-001',
      actor_org_id: 2, // City Medicos
      location: 'Checkout Terminal 1',
    });
  }

  // 9. Duplicate Serial across two facilities (~20 events) -> CRITICAL (Manufacturer + Regulator)
  for (let i = 0; i < 20; i++) {
    const t = new Date(baseTime + 7000000 + i * 100 * 1000).toISOString();
    events.push({
      id: `SIM-DUPSER-${i + 1}`,
      event_type: 'DUPLICATE_SERIAL',
      timestamp: t,
      batch_number: 'ATO-2026-012',
      serial_id: `SN-GLOBAL-COLLISION-${(i % 3) + 1}`,
      actor_org_id: (i % 2) + 1, // Alternates between Apollo & City Medicos
      location: 'Serial Scanner Bay',
    });
  }

  // Process all events sequentially through the intelligence engine
  let normalCountResult = 0;
  let suspiciousCountResult = 0;
  let alertsCreated = 0;
  let suppressedCount = 0;
  const uniqueCaseIds = new Set<string>();

  const notificationsCount = {
    retailer: 0,
    distributor: 0,
    manufacturer: 0,
    waste_facility: 0,
    regulator: 0,
  };

  for (const ev of events) {
    const res = await processEvent(ev);
    if (res.isNormalTransaction) {
      normalCountResult++;
    } else {
      suspiciousCountResult++;
      if (res.alert) alertsCreated++;
      if (res.isDuplicateSuppressed) suppressedCount++;
      if (res.caseData) uniqueCaseIds.add(res.caseData.id);

      for (const n of res.notifications) {
        if (n.recipient_role in notificationsCount) {
          notificationsCount[n.recipient_role as keyof typeof notificationsCount]++;
        }
      }
    }
  }

  // Final case metrics query
  const { getInvestigationCases } = await import('@/lib/supabase/db');
  const allCases = await getInvestigationCases();

  const casesBySeverity = {
    LOW: allCases.filter((c) => c.severity === 'LOW').length,
    MEDIUM: allCases.filter((c) => c.severity === 'MEDIUM' || c.severity === 'WARNING').length,
    HIGH: allCases.filter((c) => c.severity === 'HIGH').length,
    CRITICAL: allCases.filter((c) => c.severity === 'CRITICAL').length,
  };

  const regulatorActionableCases = allCases.filter(
    (c) => c.severity === 'CRITICAL' || c.severity === 'HIGH' || c.escalation_level === 'REGULATOR'
  ).length;

  return {
    totalRawEvents: events.length,
    normalEventsCount: normalCountResult,
    suspiciousEventsCount: suspiciousCountResult,
    alertsCreatedCount: alertsCreated,
    casesCreatedCount: allCases.length,
    casesGroupedCount: uniqueCaseIds.size,
    duplicateAlertsSuppressedCount: suppressedCount,
    regulatorActionableCasesCount: regulatorActionableCases,
    casesBySeverity,
    notificationsByRole: notificationsCount,
    summaryMessage:
      `Simulated ${events.length} events -> ${suspiciousCountResult} suspicious events -> ` +
      `${alertsCreated} alerts -> ${allCases.length} investigation cases (${casesBySeverity.CRITICAL} CRITICAL, ${casesBySeverity.HIGH} HIGH). ` +
      `Regulator received only ${regulatorActionableCases} actionable cases instead of ${events.length} raw alerts.`,
  };
}
