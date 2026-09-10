/**
 * MEDTRACE END-TO-END VERIFICATION SUITE
 * Executes all 16 Acceptance Tests from Section 39 + Section 34 Negative Tests + Role Security.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function test(name, fn) {
  process.stdout.write(`TEST: ${name}... `);
  try {
    await fn();
    console.log('✅ PASSED');
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    return false;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING MEDTRACE SPECIFICATION VERIFICATION SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // TEST 14: QR token resolution for PCM2026A01
  total++;
  if (await test('TEST 14: QR scan PCM2026A01-TOKEN resolves correct batch', async () => {
    const res = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=PCM2026A01-TOKEN`);
    const json = await res.json();
    assert(json.success === true, 'Response was not success');
    assert(json.data.batch_number === 'PCM2026A01', 'Batch number mismatch');
    assert(json.data.status === 'ACTIVE', 'Batch was not ACTIVE');
  })) passed++;

  // TEST 15: QR scan AMX-DEMO-001-TOKEN -> resolve destroyed batch -> sale blocked
  total++;
  if (await test('TEST 15: QR scan AMX-DEMO-001-TOKEN resolves destroyed batch & sale blocked', async () => {
    const resResolve = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=AMX-DEMO-001-TOKEN`);
    const jsonResolve = await resResolve.json();
    assert(jsonResolve.success === true, 'Resolve failed');
    assert(jsonResolve.data.batch_number === 'AMX-DEMO-001', 'Mismatch');

    const resSale = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'AMX-DEMO-001', retailer_org_id: 1 }),
    });
    const jsonSale = await resSale.json();
    assert(jsonSale.success === true, 'API failed');
    assert(jsonSale.data.blocked === true, 'Sale was not blocked');
    assert(jsonSale.data.message.includes('BLOCKED - this batch was destroyed'), 'Expected destruction block message');
  })) passed++;

  // TEST 8: Destroyed batch sale attempt -> blocked
  total++;
  if (await test('TEST 8: Destroyed batch sale attempt is blocked by fraud engine', async () => {
    const res = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'AMX-DEMO-001', retailer_org_id: 1 }),
    });
    const json = await res.json();
    assert(json.data.blocked === true, 'Sale should be blocked');
  })) passed++;

  // TEST 9: Destroyed batch second/third attempt -> CRITICAL severity
  total++;
  if (await test('TEST 9: Repeated blocked sale attempts escalate to CRITICAL severity', async () => {
    const res = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'AMX-DEMO-001', retailer_org_id: 1 }),
    });
    const json = await res.json();
    assert(json.data.blocked === true, 'Sale should be blocked');
    assert(json.data.severity === 'CRITICAL', `Expected CRITICAL severity, got ${json.data.severity}`);
  })) passed++;

  // TEST 10: Expired active batch -> sale attempt -> WARNING + blocked
  total++;
  if (await test('TEST 10: Expired active batch sale attempt -> WARNING + blocked', async () => {
    const res = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'PCM-EXP-999', retailer_org_id: 1 }),
    });
    const json = await res.json();
    assert(json.data.blocked === true, 'Sale must be blocked for expired batch');
    assert(json.data.severity === 'WARNING', `Expected WARNING, got ${json.data.severity}`);
    assert(json.data.message.includes('expired batch'), 'Expected expired message');
  })) passed++;

  // TEST 11: Unknown batch -> blocked
  total++;
  if (await test('TEST 11: Unknown batch number sale attempt is blocked', async () => {
    const res = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'UNKNOWN-XYZ-999', retailer_org_id: 1 }),
    });
    const json = await res.json();
    assert(json.data.blocked === true, 'Unknown batch must be blocked');
    assert(json.data.message.includes('Unknown batch number'), 'Expected unknown message');
  })) passed++;

  // TEST 12: Valid active non-expired batch -> sale allowed
  total++;
  if (await test('TEST 12: Valid active non-expired batch -> sale allowed', async () => {
    const res = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'AZI-2026-088', retailer_org_id: 1 }),
    });
    const json = await res.json();
    assert(json.data.blocked === false, 'Sale must be allowed');
    assert(json.data.message === 'Sale allowed', 'Expected sale allowed message');
  })) passed++;

  // NEGATIVE TEST: ACTIVE batch -> Direct destruction attempt -> REJECT
  total++;
  if (await test('NEGATIVE TEST: ACTIVE batch -> direct destruction attempt is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01', // Currently ACTIVE
        manufacturer_org_id: 5,
        facility_name: 'Test Incinerator',
        qty_destroyed: 100,
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // NEGATIVE TEST: Retailer cannot return batch owned by different pharmacy
  total++;
  if (await test('NEGATIVE TEST: Retailer cannot initiate return on batch owned by different pharmacy', async () => {
    // City Medicos (org 2) trying to return PCM2026A01 (owned by Apollo Pharmacy, org 1)
    const res = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        retailer_org_id: 2, // Mismatched owner
        qty_claimed: 100,
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection of cross-owner return');
  })) passed++;

  // NEGATIVE TEST: Return quantity > batch quantity is rejected
  total++;
  if (await test('NEGATIVE TEST: Return quantity > available batch quantity is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        retailer_org_id: 1,
        qty_claimed: 999999, // Exceeds 100
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // NEGATIVE TEST: Zero return quantity is rejected
  total++;
  if (await test('NEGATIVE TEST: Zero quantity in return request is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        retailer_org_id: 1,
        qty_claimed: 0,
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // TEST 1: Active batch -> initiate return -> RETURN_INITIATED
  let liveReturnId;
  total++;
  if (await test('TEST 1: Active batch -> initiate return -> status RETURN_INITIATED', async () => {
    const res = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        retailer_org_id: 1,
        qty_claimed: 100,
        condition: 'Expired pharmacy stock',
        photo: '/demo/evidence/amx-return.jpg',
      }),
    });
    const json = await res.json();
    assert(json.success === true, `Failed: ${json.error}`);
    liveReturnId = json.data.id;

    // Verify batch status updated
    const resBatch = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=PCM2026A01-TOKEN`);
    const jsonBatch = await resBatch.json();
    assert(jsonBatch.data.status === 'RETURN_INITIATED', `Expected RETURN_INITIATED, got ${jsonBatch.data.status}`);
  })) passed++;

  // NEGATIVE TEST: RETURN_INITIATED batch -> Direct destruction attempt -> REJECT
  total++;
  if (await test('NEGATIVE TEST: RETURN_INITIATED batch -> direct destruction attempt is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01', // Status is RETURN_INITIATED
        manufacturer_org_id: 5,
        facility_name: 'Test Incinerator',
        qty_destroyed: 100,
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // NEGATIVE TEST: Retailer cannot confirm pickup
  total++;
  if (await test('NEGATIVE TEST: Retailer cannot confirm pickup (role enforcement)', async () => {
    const res = await fetch(`${BASE_URL}/api/returns/${liveReturnId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qty_received: 100,
        distributor_org_id: 1, // Retailer Org, NOT Distributor!
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // TEST 3: Return initiated -> mismatched pickup -> DISPUTED
  total++;
  if (await test('TEST 3: Return initiated -> mismatched pickup -> DISPUTED', async () => {
    const res = await fetch(`${BASE_URL}/api/returns/${liveReturnId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qty_received: 80, // Mismatch (claimed was 100)
        distributor_org_id: 4, // MedLine Distributors
      }),
    });
    const json = await res.json();
    assert(json.success === true, `Failed: ${json.error}`);
    assert(json.disputed === true, 'Dispute flag not set');
    assert(json.batchStatus === 'DISPUTED', `Expected DISPUTED, got ${json.batchStatus}`);
  })) passed++;

  // TEST 7: Try destruction for disputed batch -> reject
  total++;
  if (await test('TEST 7: Try destruction for disputed batch -> reject', async () => {
    const res = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        manufacturer_org_id: 5, // Cipla Ltd
        facility_name: 'Test Facility',
        qty_destroyed: 80,
      }),
    });
    const json = await res.json();
    assert(json.success === false, 'Should reject destruction for DISPUTED batch');
    assert(json.error.includes('Only \'RETURN_CONFIRMED\' batches can be destroyed'), 'Expected status error');
  })) passed++;

  // NEGATIVE TEST: Non-distributor cannot resolve dispute
  total++;
  if (await test('NEGATIVE TEST: Non-distributor cannot resolve dispute', async () => {
    const res = await fetch(`${BASE_URL}/api/disputes/${liveReturnId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corrected_qty: 100,
        distributor_org_id: 1, // Retailer Org, NOT distributor
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // TEST 4: Disputed -> resolve -> return confirmed
  total++;
  if (await test('TEST 4: Disputed -> resolve dispute -> RETURN_CONFIRMED', async () => {
    const res = await fetch(`${BASE_URL}/api/disputes/${liveReturnId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corrected_qty: 100,
        distributor_org_id: 4,
      }),
    });
    const json = await res.json();
    assert(json.success === true, `Failed: ${json.error}`);

    // Verify batch status is now RETURN_CONFIRMED
    const resBatch = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=PCM2026A01-TOKEN`);
    const jsonBatch = await resBatch.json();
    assert(jsonBatch.data.status === 'RETURN_CONFIRMED', `Expected RETURN_CONFIRMED, got ${jsonBatch.data.status}`);
  })) passed++;

  // TEST 6: Try certificate before destruction -> reject
  total++;
  if (await test('TEST 6: Try certificate before destruction exists -> reject', async () => {
    const res = await fetch(`${BASE_URL}/api/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        destruction_id: 99999, // Doesn't exist
      }),
    });
    const json = await res.json();
    assert(json.success === false, 'Certificate without destruction record must be rejected');
    assert(json.error.includes('does not exist'), 'Expected destruction record error');
  })) passed++;

  // NEGATIVE TEST: Non-manufacturer cannot log destruction
  total++;
  if (await test('NEGATIVE TEST: Non-manufacturer cannot log destruction', async () => {
    const res = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        manufacturer_org_id: 1, // Retailer Org, NOT manufacturer
        facility_name: 'Test Incinerator',
        qty_destroyed: 100,
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection');
  })) passed++;

  // TEST 5: Return confirmed -> destruction -> certificate -> DESTROYED
  let destructionId;
  total++;
  if (await test('TEST 5: Return confirmed -> log destruction -> issue certificate -> DESTROYED', async () => {
    // 1. Log destruction
    const resDestruct = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        manufacturer_org_id: 5, // Cipla Ltd
        facility_name: 'Cipla Hazardous Incineration Facility Unit 4, Verna, Goa',
        qty_destroyed: 100,
        evidence: '/demo/evidence/amx-incineration.jpg',
      }),
    });
    const jsonDestruct = await resDestruct.json();
    assert(jsonDestruct.success === true, `Destruction failed: ${jsonDestruct.error}`);
    destructionId = jsonDestruct.data.id;

    // 2. Issue Certificate
    const resCert = await fetch(`${BASE_URL}/api/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        destruction_id: destructionId,
        actor_org_id: 5,
      }),
    });
    const jsonCert = await resCert.json();
    assert(jsonCert.success === true, `Certificate failed: ${jsonCert.error}`);
    assert(jsonCert.data.certificate_no.startsWith('MTC-2026-'), 'Invalid certificate format');

    // 3. Verify batch is DESTROYED
    const resBatch = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=PCM2026A01-TOKEN`);
    const jsonBatch = await resBatch.json();
    assert(jsonBatch.data.status === 'DESTROYED', `Expected DESTROYED, got ${jsonBatch.data.status}`);
  })) passed++;

  // TEST 13: Destroyed batch -> attempt return -> reject
  total++;
  if (await test('TEST 13: Destroyed batch -> attempt return/transition -> reject', async () => {
    const res = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        retailer_org_id: 1,
        qty_claimed: 100,
      }),
    });
    const json = await res.json();
    assert(json.success === false, 'Cannot modify DESTROYED batch');
    assert(json.error.includes('permanently DESTROYED'), 'Expected terminal destroyed error');
  })) passed++;

  // NEGATIVE TEST: Destroyed batch -> attempt destruction -> reject
  total++;
  if (await test('NEGATIVE TEST: Destroyed batch -> attempt second destruction -> reject', async () => {
    const res = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'AMX-DEMO-001', // Already DESTROYED
        manufacturer_org_id: 5,
        facility_name: 'Test Incinerator',
        qty_destroyed: 50,
      }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected rejection of destruction on DESTROYED batch');
  })) passed++;

  // TEST 16: Regulator dashboard alerts feed verification
  total++;
  if (await test('TEST 16: Regulator feed retrieves generated alerts with audit metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/alerts`);
    const json = await res.json();
    assert(json.success === true, 'Failed to fetch alerts');
    assert(Array.isArray(json.data) && json.data.length > 0, 'No alerts found');
    const hasCritical = json.data.some((a) => a.severity === 'CRITICAL');
    assert(hasCritical, 'Expected at least one CRITICAL alert in feed');
  })) passed++;

  // TEST 17: Duplicate destruction attempt is rejected
  total++;
  if (await test('TEST 17: Duplicate destruction attempt is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/destructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        manufacturer_org_id: 5,
        facility_name: 'Cipla Hazardous Incineration Facility Unit 4, Verna, Goa',
        qty_destroyed: 100,
      }),
    });
    const json = await res.json();
    assert(json.success === false, 'Duplicate destruction must be rejected');
  })) passed++;

  // TEST 18: Duplicate certificate issuance on DESTROYED batch is rejected
  total++;
  if (await test('TEST 18: Duplicate certificate issuance on DESTROYED batch is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'PCM2026A01',
        destruction_id: destructionId,
      }),
    });
    const json = await res.json();
    assert(json.success === false, 'Duplicate certificate must be rejected');
  })) passed++;

  // TEST 19: Mismatched destruction batch in certificate request is rejected
  total++;
  if (await test('TEST 19: Mismatched destruction record batch is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'AMX-DEMO-001',
        destruction_id: destructionId,
      }),
    });
    const json = await res.json();
    assert(json.success === false, 'Mismatched destruction batch must be rejected');
  })) passed++;

  // TEST 20: Unrecognized QR token resolution returns 404
  total++;
  if (await test('TEST 20: Unrecognized QR token resolution returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/batches/resolve?qr_token=FAKE-INVALID-TOKEN-999`);
    assert(res.status === 404, `Expected status 404, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected success: false');
  })) passed++;

  // TEST 21: Invalid quantity (<= 0) in return request is rejected
  total++;
  if (await test('TEST 21: Invalid quantity (<= 0) in return request is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_number: 'AZI-2026-088',
        retailer_org_id: 1,
        qty_claimed: -10,
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const json = await res.json();
    assert(json.success === false, 'Expected success: false');
  })) passed++;

  // TEST 22: Repeated fraud attack escalation across multiple pharmacies
  total++;
  if (await test('TEST 22: Cross-pharmacy fraud attack escalation on destroyed batch PCM2026A01', async () => {
    // Attempt 1: by Apollo Pharmacy (Org 1) -> blocked, severity HIGH (first attempt on PCM2026A01)
    const res1 = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'PCM2026A01', retailer_org_id: 1 }),
    });
    const json1 = await res1.json();
    assert(json1.data.blocked === true, 'Sale must be blocked');
    assert(json1.data.severity === 'HIGH', `Expected attempt #1 severity HIGH, got ${json1.data.severity}`);

    // Attempt 2: by DIFFERENT Pharmacy (City Medicos, Org 2) -> blocked, severity CRITICAL
    const res2 = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'PCM2026A01', retailer_org_id: 2 }),
    });
    const json2 = await res2.json();
    assert(json2.data.blocked === true, 'Sale must be blocked');
    assert(json2.data.severity === 'CRITICAL', `Expected attempt #2 severity CRITICAL, got ${json2.data.severity}`);

    // Attempt 3: by Third Pharmacy (Sunrise Pharmacy, Org 3) -> blocked, severity CRITICAL
    const res3 = await fetch(`${BASE_URL}/api/sale-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_number: 'PCM2026A01', retailer_org_id: 3 }),
    });
    const json3 = await res3.json();
    assert(json3.data.blocked === true, 'Sale must be blocked');
    assert(json3.data.severity === 'CRITICAL', `Expected attempt #3 severity CRITICAL, got ${json3.data.severity}`);
  })) passed++;

  // TEST 23: Verify Regulator feed captures cross-pharmacy fraud alert
  total++;
  if (await test('TEST 23: Regulator alert correctly attributes fraud attempt to City Medicos (org_id: 2)', async () => {
    const res = await fetch(`${BASE_URL}/api/alerts`);
    const json = await res.json();
    assert(json.success === true, 'Failed to fetch alerts');
    const cityMedicosAlert = json.data.find(
      (a) => a.batch_number === 'PCM2026A01' && a.attempted_by_org_id === 2
    );
    assert(cityMedicosAlert !== undefined, 'Expected alert attributed to City Medicos (org_id: 2)');
    assert(cityMedicosAlert.severity === 'CRITICAL', 'Cross-pharmacy re-entry alert must be CRITICAL');
  })) passed++;

  // TEST 24: Retailer inventory isolation across multiple pharmacies
  total++;
  if (await test('TEST 24: Retailer inventory queries isolate batches by current_holder_org_id', async () => {
    // Org 2: City Medicos
    const resOrg2 = await fetch(`${BASE_URL}/api/batches?holder_org_id=2`);
    const jsonOrg2 = await resOrg2.json();
    assert(jsonOrg2.success === true, 'Failed to fetch Org 2 batches');
    assert(jsonOrg2.data.length > 0, 'City Medicos must have inventory batches');
    const allOrg2 = jsonOrg2.data.every((b) => b.current_holder_org_id === 2);
    assert(allOrg2, 'Inventory should only include batches held by Org 2');

    // Org 3: Sunrise Pharmacy
    const resOrg3 = await fetch(`${BASE_URL}/api/batches?holder_org_id=3`);
    const jsonOrg3 = await resOrg3.json();
    assert(jsonOrg3.success === true, 'Failed to fetch Org 3 batches');
    assert(jsonOrg3.data.length > 0, 'Sunrise Pharmacy must have inventory batches');
    const allOrg3 = jsonOrg3.data.every((b) => b.current_holder_org_id === 3);
    assert(allOrg3, 'Inventory should only include batches held by Org 3');
  })) passed++;

  // TEST 25: Disputes API endpoint
  total++;
  if (await test('TEST 25: Disputes endpoint (/api/disputes) returns custody dispute ledger', async () => {
    const res = await fetch(`${BASE_URL}/api/disputes`);
    const json = await res.json();
    assert(json.success === true, 'Failed to fetch disputes');
    assert(Array.isArray(json.data), 'Expected array of disputes');
  })) passed++;

  // TEST 26: Certificates API endpoint
  total++;
  if (await test('TEST 26: Certificates endpoint (/api/certificates) returns issued certificates', async () => {
    const res = await fetch(`${BASE_URL}/api/certificates`);
    const json = await res.json();
    assert(json.success === true, 'Failed to fetch certificates');
    assert(Array.isArray(json.data) && json.data.length > 0, 'Expected certificates to be present');
  })) passed++;

  // Batch 360 Timeline verification
  total++;
  if (await test('TEST EXTRA: Batch 360 timeline aggregates complete lifecycle from DB', async () => {
    const res = await fetch(`${BASE_URL}/api/batches/PCM2026A01/timeline`);
    const json = await res.json();
    assert(json.success === true, 'Failed to fetch timeline');
    assert(json.data.timeline.length >= 5, 'Timeline must contain full lifecycle events');
    assert(json.data.isRegisteredDestroyed === true, 'Must reflect in batch_registry');
  })) passed++;

  console.log('\n====================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
