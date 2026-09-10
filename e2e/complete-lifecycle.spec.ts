import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Master Complete Reverse-Chain Compliance Lifecycle @e2e @smoke', () => {
  test('Full closed-loop journey across all 4 stakeholders from expired return to blocked re-entry and 360° investigation', async ({ page, request }) => {
    // 0. Ensure deterministic initial state
    resetDatabase();

    // Verify initial state of PCM2026A01
    const initCheck = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const initJson = await initCheck.json();
    expect(initJson.data.status).toBe('ACTIVE');
    expect(initJson.data.quantity).toBe(100);

    // =========================================================================
    // PHASE A: APOLLO PHARMACY — INITIATE RETURN
    // =========================================================================
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('h1:has-text("Apollo Pharmacy - Ajmer")')).toBeVisible();

    // Locate PCM2026A01 row and open Initiate Return modal
    const batchRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(batchRow).toBeVisible();
    await batchRow.locator('button:has-text("Initiate Return")').click();

    // Fill & Submit Return Modal
    const returnModal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Initiate Pharmaceutical Return' }).first();
    await expect(returnModal).toBeVisible();

    const submitReturnBtn = returnModal.locator('button[type="submit"]:has-text("Confirm Return Initiation"), button[type="submit"]:has-text("Submit Return Request")').first();
    await submitReturnBtn.click();

    await expect(returnModal).not.toBeVisible({ timeout: 10000 });

    // Verify status updated to RETURN_INITIATED in table and DB
    await expect(page.locator('tr:has-text("PCM2026A01")').locator('text=/RETURN.?INITIATED/i')).toBeVisible();

    const phaseACheck = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const phaseAJson = await phaseACheck.json();
    expect(phaseAJson.data.status).toBe('RETURN_INITIATED');

    // =========================================================================
    // PHASE B: MEDLINE DISTRIBUTORS — VERIFY & CONFIRM PICKUP
    // =========================================================================
    await page.goto('/login');
    await page.click('#enter-distributor-btn');

    await expect(page).toHaveURL(/\/distributor/);
    await expect(page.locator('h1:has-text("MedLine Distributors")')).toBeVisible();

    // Locate PCM2026A01 in Incoming Returns table
    const incomingRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(incomingRow).toBeVisible();
    await incomingRow.locator('button:has-text("Confirm Pickup")').click();

    // Confirm Pickup modal
    const pickupModal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Verify & Confirm Physical Intake' }).first();
    await expect(pickupModal).toBeVisible();

    const confirmPickupBtn = pickupModal.locator('button[type="submit"]:has-text("Confirm Pickup (RETURN_CONFIRMED)"), button:has-text("Confirm Intake")').first();
    await confirmPickupBtn.click();

    await expect(pickupModal).not.toBeVisible({ timeout: 10000 });

    // Verify batch status is now RETURN_CONFIRMED
    const phaseBCheck = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const phaseBJson = await phaseBCheck.json();
    expect(phaseBJson.data.status).toBe('RETURN_CONFIRMED');

    // =========================================================================
    // PHASE C: CIPLA LTD — BIO-HAZARDOUS DESTRUCTION & CERTIFICATE
    // =========================================================================
    await page.goto('/login');
    await page.click('#enter-manufacturer-btn');

    await expect(page).toHaveURL(/\/manufacturer/);
    await expect(page.locator('h1:has-text("Cipla Ltd")')).toBeVisible();

    // Find PCM2026A01 ready for destruction
    const confirmedPickupRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(confirmedPickupRow).toBeVisible();
    await confirmedPickupRow.locator('button:has-text("Schedule & Confirm Destruction"), button:has-text("Destruction")').first().click();

    const destructionModal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'MedTrace Digital Destruction Protocol' }).first();
    await expect(destructionModal).toBeVisible();

    // Step 1: Record destruction
    await destructionModal.locator('button[type="submit"]:has-text("Confirm Destruction Execution"), button[type="submit"]:has-text("Record & Confirm")').click();

    // Step 2: Issue Certificate
    await expect(destructionModal.locator('text=Certificate of Destruction').first()).toBeVisible();
    await destructionModal.locator('button:has-text("Issue Certificate & Lock Registry"), button:has-text("Issue Certificate Now")').click();

    // Step 3: Verify confirmation with Certificate Number
    await expect(destructionModal.locator('text=MEDTRACE DIGITAL DESTRUCTION CERTIFICATE').first()).toBeVisible();
    await expect(destructionModal.locator('text=MTC-2026-').first()).toBeVisible();

    await destructionModal.locator('button:has-text("Done & Return to Dashboard"), button:has-text("Done")').click();
    await expect(destructionModal).not.toBeVisible();

    // Verify batch status is terminal DESTROYED in DB
    const phaseCCheck = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const phaseCJson = await phaseCCheck.json();
    expect(phaseCJson.data.status).toBe('DESTROYED');

    // =========================================================================
    // PHASE D: CITY MEDICOS — ATTEMPT ILLEGAL SALE & ESCALATE
    // =========================================================================
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.CITY_MEDICOS));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('h1:has-text("City Medicos")')).toBeVisible();

    // Open Sell / Dispense simulator
    await page.click('button:has-text("Sell / Dispense")');
    await page.click('button:has-text("Manual Batch Number Entry")');

    // Attempt sale of destroyed batch PCM2026A01
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');
    await page.click('button:has-text("Verify Sale")');

    // First attempt -> BLOCKED with HIGH severity
    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=SEVERITY: HIGH')).toBeVisible();

    // Second attempt -> ESCALATED TO CRITICAL
    await page.click('button:has-text("Scan Another Package")');
    await page.click('button:has-text("Manual Batch Number Entry")');
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');
    await page.click('button:has-text("Verify Sale")');

    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=SEVERITY: CRITICAL')).toBeVisible();

    // =========================================================================
    // PHASE E: STATE DRUG CONTROLLER — LIVE ALERT & INVESTIGATION
    // =========================================================================
    await page.goto('/login');
    await page.click('#enter-regulator-btn');

    await expect(page).toHaveURL(/\/regulator/);
    await expect(page.locator('h1:has-text("State Drug Controller")')).toBeVisible();

    // Find Critical alert for PCM2026A01 attributed to City Medicos
    const criticalAlert = page.locator('a[href*="/batch/PCM2026A01"]').filter({ hasText: 'CRITICAL' }).first();
    await expect(criticalAlert).toBeVisible();
    await expect(criticalAlert.locator('text=City Medicos')).toBeVisible();

    // Click INVESTIGATE (the entire card is a link to /batch/PCM2026A01)
    await criticalAlert.click();

    // =========================================================================
    // PHASE F: BATCH 360° COMPLETE AUDIT TRAIL PROOF
    // =========================================================================
    await expect(page).toHaveURL(/\/batch\/PCM2026A01/);
    await expect(page.locator('h1:has-text("PCM2026A01")')).toBeVisible();
    await expect(page.locator('text=PERMANENT REGISTRY LOCKED (DESTROYED)').first()).toBeVisible();

    // Verify full chronological sequence
    await expect(page.locator('text=/Reverse Return Initiated|Return Initiated/i').first()).toBeVisible();
    await expect(page.locator('text=/Distributor Custody Verified|RETURN_CONFIRMED/i').first()).toBeVisible();
    await expect(page.locator('text=/Hazardous Destruction Executed|DESTRUCTION LOGGED/i').first()).toBeVisible();
    await expect(page.locator('text=/Destruction Certificate Issued|DESTROYED/i').first()).toBeVisible();
    await expect(page.locator('text=/Sale Attempt Blocked|SALE BLOCKED/i').first()).toBeVisible();
    await expect(page.locator('main').locator('text=City Medicos').first()).toBeVisible();

    // Verify Photographic & Certificate Evidence tab
    await page.click('button:has-text("Evidence")');
    await expect(page.locator('text=/MedTrace Compliance Certificate|Official Compliance Certificate/').first()).toBeVisible();
    await expect(page.locator('text=MTC-2026-').first()).toBeVisible();
    await expect(page.locator('img[alt="Destruction Evidence"]').first()).toBeVisible();

    // Reset database to clean demo state for judging presentation
    resetDatabase();
  });
});
