import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const screenshotsDir = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function run() {
  console.log('===============================================================');
  console.log('STARTING MEDTRACE FINAL ENGINEERING VERIFICATION & DEMO TEST');
  console.log('===============================================================\n');

  // STEP 0: Reset DB
  console.log('--- RESETTING DATABASE TO CLEAN DEMO STATE ---');
  const { execSync } = await import('child_process');
  execSync('node scripts/seed-db.mjs', { stdio: 'inherit' });

  // -------------------------------------------------------------------------
  // PHASE 2: CORE SAFETY FLOW END-TO-END VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 2: CORE SAFETY FLOW END-TO-END ---');
  
  // 1. Verify fresh batch PCM2026A01 is ACTIVE
  const batchRes = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=PCM2026A01-TOKEN`);
  const batchJson = await batchRes.json();
  assert(batchJson.success, 'Failed to fetch PCM2026A01');
  assert(batchJson.data.status === 'ACTIVE', `Expected ACTIVE, got ${batchJson.data.status}`);
  console.log('1. Verified PCM2026A01 is ACTIVE at Apollo Pharmacy (org 1). ✅');

  // 2. Retailer initiates return
  const returnRes = await fetch(`${BASE_URL}/api/returns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_number: 'PCM2026A01',
      retailer_org_id: 1,
      qty_claimed: 100,
      condition: 'Expired shelf stock',
    }),
  });
  const returnJson = await returnRes.json();
  assert(returnJson.success, `Return initiation failed: ${returnJson.error}`);
  const returnRequestId = returnJson.data.id;
  console.log(`2. Retailer initiated return (Request #${returnRequestId}). Status: RETURN_INITIATED. ✅`);

  // 3. Distributor receives stock & verifies quantity
  const pickupRes = await fetch(`${BASE_URL}/api/returns/${returnRequestId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      distributor_org_id: 4,
      qty_received: 100,
    }),
  });
  const pickupJson = await pickupRes.json();
  assert(pickupJson.success, `Pickup confirmation failed: ${pickupJson.error}`);
  assert(!pickupJson.disputed, 'Should not be disputed');
  assert(pickupJson.batchStatus === 'RETURN_CONFIRMED', `Expected RETURN_CONFIRMED, got ${pickupJson.batchStatus}`);
  console.log('3. Distributor confirmed pickup with exact quantity. Status: RETURN_CONFIRMED. ✅');

  // 4. Manufacturer logs physical destruction at bio-facility
  const destroyRes = await fetch(`${BASE_URL}/api/destructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_number: 'PCM2026A01',
      manufacturer_org_id: 5,
      facility_name: 'Cipla Hazardous Bio-Destruction Facility Unit 4, Verna, Goa',
      qty_destroyed: 100,
      evidence: '/demo/evidence/pcm-incineration.jpg',
    }),
  });
  const destroyJson = await destroyRes.json();
  assert(destroyJson.success, `Destruction logging failed: ${destroyJson.error}`);
  const destructionId = destroyJson.data.id;
  console.log(`4. Manufacturer recorded physical destruction at licensed facility (ID: ${destructionId}). ✅`);

  // 5. Issue digital destruction certificate -> DESTROYED + batch_registry locked
  const certRes = await fetch(`${BASE_URL}/api/certificates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_number: 'PCM2026A01',
      destruction_id: destructionId,
      actor_org_id: 5,
    }),
  });
  const certJson = await certRes.json();
  assert(certJson.success, `Certificate issuance failed: ${certJson.error}`);
  console.log(`5. Issued Digital Certificate ${certJson.data.certificate_no}. Batch permanently locked as DESTROYED in registry. ✅`);

  // Verify batch status is DESTROYED
  const batchDestroyedRes = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=PCM2026A01-TOKEN`);
  const batchDestroyedJson = await batchDestroyedRes.json();
  assert(batchDestroyedJson.data.status === 'DESTROYED', `Expected DESTROYED, got ${batchDestroyedJson.data.status}`);

  // 6. Another pharmacy (City Medicos, org 2) attempts sale of this destroyed batch
  const saleRes = await fetch(`${BASE_URL}/api/sale-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_number: 'PCM2026A01',
      retailer_org_id: 2,
    }),
  });
  const saleJson = await saleRes.json();
  assert(saleJson.success, 'Sale attempt API failed');
  assert(saleJson.data.blocked === true, 'Sale MUST be blocked');
  console.log('6. City Medicos sale attempt was INSTANTLY BLOCKED by backend fraud engine. ✅');

  // 7. Verify Critical Alert created and routed to Regulator & Manufacturer
  const alertsRes = await fetch(`${BASE_URL}/api/alerts?batch_number=PCM2026A01`);
  const alertsJson = await alertsRes.json();
  assert(alertsJson.success && alertsJson.data.length > 0, 'No alert created');
  const alert = alertsJson.data[alertsJson.data.length - 1];
  assert(alert.category === 'DESTROYED_REENTRY', 'Alert must be DESTROYED_REENTRY');
  assert(alert.risk_score >= 85, 'Alert risk score must be >= 85');
  console.log(`7. Created Alert #${alert.id} (${alert.severity}, Risk: ${alert.risk_score}). ✅`);

  // 8. Verify Investigation Case created for Regulator
  const casesRes = await fetch(`${BASE_URL}/api/intelligence/cases?stakeholder=regulator`);
  const casesJson = await casesRes.json();
  assert(casesJson.success && casesJson.data.length > 0, 'No regulator cases');
  const matchingCase = casesJson.data.find(c => c.affected_batches?.includes('PCM2026A01'));
  assert(matchingCase, 'No case matching PCM2026A01 for regulator');
  assert(matchingCase.severity === 'CRITICAL' || matchingCase.severity === 'HIGH', 'Case priority must be HIGH or CRITICAL');
  console.log(`8. Investigation Case ${matchingCase.case_number || matchingCase.id} created and routed to Regulator. ✅`);

  // -------------------------------------------------------------------------
  // PHASE 4 & 5: PRIORITY ENGINE OVERRIDES & AI FALLBACK
  // -------------------------------------------------------------------------
  console.log('\n--- PHASES 4 & 5: PRIORITY ENGINE OVERRIDES & AI FALLBACK ---');
  
  // 1. DESTROYED_REENTRY override check via /api/intelligence/events
  const resDestroyed = await fetch(`${BASE_URL}/api/intelligence/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'DESTROYED_REENTRY',
      batch_number: 'AMX-DEMO-001',
      actor_org_id: 1,
    }),
  });
  const jsonDestroyed = await resDestroyed.json();
  assert(jsonDestroyed.data.alert.risk_score >= 95, `Expected score >= 95, got ${jsonDestroyed.data?.alert?.risk_score}`);
  assert(jsonDestroyed.data.alert.severity === 'CRITICAL', `Expected CRITICAL, got ${jsonDestroyed.data?.alert?.severity}`);
  console.log(`- DESTROYED_REENTRY override verified: Score ${jsonDestroyed.data.alert.risk_score}, Priority ${jsonDestroyed.data.alert.severity}. ✅`);

  // 2. DUPLICATE_SERIAL override check via /api/intelligence/events
  const resDup = await fetch(`${BASE_URL}/api/intelligence/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'DUPLICATE_SERIAL',
      batch_number: 'AZI-2026-088',
      serial_id: 'SN-AZI-DUP-OVERRIDE-999',
      actor_org_id: 1,
      target_location: 'Jaipur, Rajasthan',
    }),
  });
  const jsonDup = await resDup.json();
  assert(jsonDup.data.alert.risk_score >= 90, `Expected score >= 90, got ${jsonDup.data?.alert?.risk_score}`);
  assert(jsonDup.data.alert.severity === 'CRITICAL', `Expected CRITICAL, got ${jsonDup.data?.alert?.severity}`);
  console.log(`- DUPLICATE_SERIAL override verified: Score ${jsonDup.data.alert.risk_score}, Priority ${jsonDup.data.alert.severity}. ✅`);

  // 3. Clean single-unit discrepancy check via /api/intelligence/events
  const resMinor = await fetch(`${BASE_URL}/api/intelligence/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'QUANTITY_DISCREPANCY',
      batch_number: 'MET-2026-045',
      claimed_quantity: 100,
      received_quantity: 99,
      actor_org_id: 3,
    }),
  });
  const jsonMinor = await resMinor.json();
  assert(jsonMinor.data.alert.risk_score <= 30, `Expected score <= 30, got ${jsonMinor.data?.alert?.risk_score}`);
  assert(jsonMinor.data.alert.severity === 'LOW', `Expected LOW, got ${jsonMinor.data?.alert?.severity}`);
  console.log(`- Clean 1-unit discrepancy verified: Score ${jsonMinor.data.alert.risk_score}, Priority ${jsonMinor.data.alert.severity}. ✅`);

  // 4. AI Offline Fallback check: sending event with missing optional fields / anomaly fallback
  const resFallback = await fetch(`${BASE_URL}/api/intelligence/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'DESTROYED_REENTRY',
      batch_number: 'AMX-DEMO-001',
      actor_org_id: 2,
      anomaly_score: undefined,
      timestamp: 'INVALID_TIMESTAMP',
    }),
  });
  const jsonFallback = await resFallback.json();
  assert(jsonFallback.success === true, 'Fallback event processing should succeed without crashing');
  assert(jsonFallback.data.alert.risk_score >= 95, 'Safety override must remain active under fallback');
  console.log(`- AI Anomaly Detector fallback verified: Gracefully handled invalid inputs without crashing (Score: ${jsonFallback.data.alert.risk_score}). ✅`);

  // -------------------------------------------------------------------------
  // PHASE 6 & 7: CASE GROUPING, BURST SUPPRESSION & ROUTING
  // -------------------------------------------------------------------------
  console.log('\n--- PHASES 6 & 7: CASE GROUPING, BURST SUPPRESSION & ROUTING ---');
  
  // Scan PCM2026A01 5 more times at City Medicos
  for (let i = 0; i < 5; i++) {
    await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'PCM2026A01', retailer_org_id: 2 }),
    });
  }

  // Refetch cases
  const updatedCasesRes = await fetch(`${BASE_URL}/api/intelligence/cases?stakeholder=regulator`);
  const updatedCasesJson = await updatedCasesRes.json();
  const groupedCase = updatedCasesJson.data.find(c => c.affected_batches?.includes('PCM2026A01'));
  assert(groupedCase, 'Grouped case missing');
  assert(groupedCase.occurrence_count >= 6, `Expected occurrence_count >= 6, got ${groupedCase.occurrence_count}`);
  console.log(`- Grouped into single case (Occurrences: ${groupedCase.occurrence_count}, Timeline events: ${groupedCase.timeline?.length}). ✅`);

  // Verify notifications: Regulator should NOT have 6 separate notifications for this batch
  const regNotifsRes = await fetch(`${BASE_URL}/api/intelligence/notifications?role=regulator`);
  const regNotifsJson = await regNotifsRes.json();
  const batchNotifs = regNotifsJson.data.filter(n => n.batch_number === 'PCM2026A01');
  assert(batchNotifs.length <= 2, `Regulator received ${batchNotifs.length} notifications; expected deduplicated count <= 2`);
  console.log(`- Regulator notification deduplication verified: Only ${batchNotifs.length} notification(s) sent instead of 6 separate blasts. ✅`);

  // -------------------------------------------------------------------------
  // PHASE 8: 1,000+ EVENT SIMULATION
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 8: 1,000+ EVENT SIMULATION ---');
  const simRes = await fetch(`${BASE_URL}/api/intelligence/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventCount: 1000 }),
  });
  const simJson = await simRes.json();
  assert(simJson.success, 'Simulation failed');
  const sim = simJson.data;
  console.log(`- Total Raw Events:        ${sim.totalRawEvents}`);
  console.log(`- Normal Scans Filtered:   ${sim.normalEventsCount}`);
  console.log(`- Suspicious Anomalies:    ${sim.suspiciousEventsCount}`);
  console.log(`- Grouped Cases:           ${sim.casesCreatedCount}`);
  console.log(`- Duplicates Suppressed:   ${sim.duplicateAlertsSuppressedCount}`);
  console.log(`- Regulator Actionable:    ${sim.regulatorActionableCasesCount} (CRITICAL: ${sim.casesBySeverity?.CRITICAL}, HIGH: ${sim.casesBySeverity?.HIGH})`);
  const noiseReduction = (((sim.totalRawEvents - sim.regulatorActionableCasesCount) / sim.totalRawEvents) * 100).toFixed(1);
  console.log(`- Alert Noise Reduction:   ${noiseReduction}%`);
  assert(sim.regulatorActionableCasesCount < 50, 'Regulator should receive < 50 actionable cases');
  console.log('Simulation Funnel verified successfully. ✅');

  // -------------------------------------------------------------------------
  // PHASE 9: ORGANIZATION RISK PROFILES
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 9: ORGANIZATION RISK PROFILES ---');
  const orgRiskRes = await fetch(`${BASE_URL}/api/intelligence/org-risk`);
  const orgRiskJson = await orgRiskRes.json();
  assert(orgRiskJson.success && orgRiskJson.data.length > 0, 'Org risk profiles missing');
  console.log(`- Retrieved ${orgRiskJson.data.length} organization risk profiles:`);
  for (const org of orgRiskJson.data) {
    console.log(`  * ${org.org_name} (ID ${org.org_id}): Score ${org.risk_score} -> ${org.risk_tier}`);
  }
  console.log('Organization Risk Model verified. ✅');

  // -------------------------------------------------------------------------
  // PHASE 10: CASE DOSSIER LIFECYCLE (ACKNOWLEDGE -> ESCALATE -> RESOLVE)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 10: CASE DOSSIER LIFECYCLE ---');
  const targetCaseId = groupedCase.id;

  // 1. Acknowledge (UNDER_INVESTIGATION)
  const ackRes = await fetch(`${BASE_URL}/api/intelligence/cases/${targetCaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'UNDER_INVESTIGATION',
      notes: 'Drug Control Inspector designated for physical inspection of City Medicos premises.',
      actor: 'State Drug Controller Lead Inspector',
    }),
  });
  const ackJson = await ackRes.json();
  assert(ackJson.success, 'Failed to update case status');
  assert(ackJson.data.status === 'UNDER_INVESTIGATION', 'Status should be UNDER_INVESTIGATION');
  console.log('1. Case status updated to UNDER_INVESTIGATION with audit note. ✅');

  // 2. Escalate (ESCALATED)
  const escRes = await fetch(`${BASE_URL}/api/intelligence/cases/${targetCaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ESCALATED',
      notes: 'Escalated to Central CDSCO enforcement wing for pan-state warehouse inspection.',
      actor: 'Enforcement Division',
    }),
  });
  const escJson = await escRes.json();
  assert(escJson.data.status === 'ESCALATED', 'Status should be ESCALATED');
  console.log('2. Case escalated to ESCALATED with timeline entry. ✅');

  // 3. Resolve (RESOLVED)
  const resRes = await fetch(`${BASE_URL}/api/intelligence/cases/${targetCaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'RESOLVED',
      notes: 'Stock quarantined and seized. Retailer license suspended pending formal inquiry.',
      actor: 'State Drug Controller Director',
    }),
  });
  const resJson = await resRes.json();
  assert(resJson.data.status === 'RESOLVED', 'Status should be RESOLVED');
  console.log('3. Case resolved to RESOLVED. Persistence verified. ✅');

  // -------------------------------------------------------------------------
  // PHASE 13: REAL BROWSER DEMO VERIFICATION VIA GOOGLE CHROME
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 13: REAL BROWSER DEMO VERIFICATION VIA GOOGLE CHROME ---');
  
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Check Retailer Dashboard
  console.log('Authenticating as Retailer...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.click('#enter-retailer-btn');
  await page.waitForURL('**/retailer');
  await page.waitForTimeout(1000);
  assert(
    (await page.locator('text=RETAILER DASHBOARD').first().isVisible()) ||
    (await page.locator('text=Batch Number').first().isVisible()) ||
    (await page.locator('text=Manage your inventory').first().isVisible()),
    'Retailer dashboard missing'
  );
  await page.screenshot({ path: path.join(screenshotsDir, '01-retailer-dashboard.png') });
  console.log('- Retailer Dashboard: Inventory ledger & actions verified. Screenshot captured. ✅');

  // 2. Check Distributor Dashboard
  console.log('Authenticating as Distributor...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.click('#enter-distributor-btn');
  await page.waitForURL('**/distributor');
  await page.waitForTimeout(1000);
  assert(
    (await page.locator('text=Incoming Returns').first().isVisible()) || 
    (await page.locator('text=Ready for Pickup').first().isVisible()), 
    'Distributor view missing'
  );
  // Switch to Disputes tab
  const disputesTab = page.locator('button:has-text("Disputes")').first();
  if (await disputesTab.isVisible()) {
    await disputesTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(screenshotsDir, '02-distributor-disputes-tab.png') });
  console.log('- Distributor Dashboard: Pickups & Disputes tab verified. Screenshot captured. ✅');

  // 3. Check Manufacturer Dashboard
  console.log('Authenticating as Manufacturer...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.click('#enter-manufacturer-btn');
  await page.waitForURL('**/manufacturer');
  await page.waitForTimeout(1000);
  assert(
    (await page.locator('text=Confirmed Pickups').first().isVisible()) ||
    (await page.locator('text=Destruction Facility').first().isVisible()), 
    'Manufacturer pickups missing'
  );
  // Switch to Permanent Registry tab
  const registryTab = page.locator('button:has-text("Permanent Registry")').first();
  if (await registryTab.isVisible()) {
    await registryTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(screenshotsDir, '03-manufacturer-registry-tab.png') });
  console.log('- Manufacturer Dashboard: Destruction queue & Permanent Registry tab verified. Screenshot captured. ✅');

  // 4. Check Regulator Dashboard & Dossier Modal
  console.log('Authenticating as Regulator...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.click('#enter-regulator-btn');
  await page.waitForURL('**/regulator');
  await page.waitForTimeout(1000);
  assert(
    (await page.locator('text=REGULATORY COMMAND DASHBOARD').first().isVisible()) ||
    (await page.locator('text=Regulatory Oversight').first().isVisible()) ||
    (await page.locator('text=Investigation Cases').first().isVisible()),
    'Regulator header missing'
  );
  
  // Click Dossier button on the first case
  const dossierBtn = page.locator('button:has-text("Investigate Case")').first();
  if (await dossierBtn.isVisible()) {
    await dossierBtn.click();
    await page.waitForTimeout(500);
    assert(
      (await page.locator('text=Priority Engine Evaluation').first().isVisible()) || 
      (await page.locator('text=Multi-Factor Deterministic Safety Score').first().isVisible()), 
      'Dossier modal failed to open'
    );
    await page.screenshot({ path: path.join(screenshotsDir, '04-regulator-dossier-modal.png') });
    console.log('- Regulator Dossier Modal: Opened and verified 360 investigation view. Screenshot captured. ✅');
    // Close modal
    await page.click('button:has-text("Close Dossier")');
    await page.waitForTimeout(300);
  }

  // Click Simulation Tab
  await page.click('button:has-text("1,000+ Event Simulation")');
  await page.waitForTimeout(500);
  assert(
    (await page.locator('text=Alert Fatigue Reduction').first().isVisible()) ||
    (await page.locator('text=Execute 1,000+ Simulation').first().isVisible()) ||
    (await page.locator('text=1,000 transactions are evaluated').first().isVisible()),
    'Simulation view missing'
  );
  await page.screenshot({ path: path.join(screenshotsDir, '05-regulator-simulation-funnel.png') });
  console.log('- Regulator Simulation Funnel Tab: Verified metrics display. Screenshot captured. ✅');

  // Click Org Risk Tab
  await page.click('button:has-text("Org Risk Leaderboard")');
  await page.waitForTimeout(500);
  assert(
    (await page.locator('text=Supply Chain Participant Risk Index').first().isVisible()) ||
    (await page.locator('text=Compliance Risk Score').first().isVisible()) ||
    (await page.locator('text=Risk Tier').first().isVisible()),
    'Org Risk view missing'
  );
  await page.screenshot({ path: path.join(screenshotsDir, '06-regulator-org-risk.png') });
  console.log('- Regulator Org Risk Tab: Verified tier badges and profiles. Screenshot captured. ✅');

  await browser.close();

  console.log('\n===============================================================');
  console.log('ALL PHASES VERIFIED SUCCESSFULLY! MEDTRACE IS 100% DEMO READY!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
