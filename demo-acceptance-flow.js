const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/saipr/.gemini/antigravity-ide/brain/30a1b525-3839-485d-8ba2-f51ba0f5ec3f';

async function runDemo() {
  console.log('--- RESETTING DATABASE TO CLEAN DEMO STATE ---');
  const DB_FILE = path.join(__dirname, '.medtrace-db.json');
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }

  // Trigger init
  const initRes = await fetch('http://localhost:3000/api/orgs');
  console.log('Orgs status:', initRes.status);

  console.log('--- LAUNCHING REAL GOOGLE CHROME ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // STEP 1: LOGIN AS APOLLO PHARMACY & INITIATE RETURN FOR PCM2026A01
  console.log('Step 1: Apollo Pharmacy Login & Initiate Return');
  await page.goto('http://localhost:3000/login');
  await page.selectOption('#retailer-org-select', '1');
  await page.click('#enter-retailer-btn');
  await page.waitForURL('**/retailer');
  await page.waitForSelector('text=PCM2026A01');

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-01-apollo-inventory.png') });

  // Click Initiate Return for PCM2026A01
  const returnBtn = page.locator('tr:has-text("PCM2026A01") button:has-text("Initiate Return")');
  await returnBtn.click();
  await page.waitForSelector('button:has-text("Confirm Return Initiation")');

  // Submit return
  await page.fill('input[placeholder*="100" i]', '100');
  await page.fill('input[placeholder*="Expired" i]', 'Expired batch reverse chain return');
  await page.click('button:has-text("Confirm Return Initiation")');

  // Verify status is RETURN INITIATED
  await page.waitForSelector('text=RETURN INITIATED');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-02-apollo-return-initiated.png') });
  console.log('Step 1 Completed: Status is RETURN_INITIATED');

  // STEP 2: SWITCH TO MEDLINE DISTRIBUTORS & CONFIRM PICKUP
  console.log('Step 2: MedLine Distributors Intake & Pickup Confirmation');
  await page.goto('http://localhost:3000/login');
  await page.click('#enter-distributor-btn');
  await page.waitForURL('**/distributor');
  await page.waitForSelector('text=PCM2026A01');

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-03-medline-incoming-return.png') });

  // Click Confirm Pickup
  await page.click('button:has-text("Confirm Pickup")');
  await page.waitForSelector('button:has-text("Confirm Pickup (RETURN_CONFIRMED)")');

  // Submit pickup confirmation
  await page.click('button:has-text("Confirm Pickup (RETURN_CONFIRMED)")');

  // Wait for confirmed
  await page.waitForSelector('text=RETURN_CONFIRMED');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-04-medline-pickup-confirmed.png') });
  console.log('Step 2 Completed: Status is RETURN_CONFIRMED');

  // STEP 3: SWITCH TO CIPLA LTD & DESTROY BATCH + ISSUE CERTIFICATE
  console.log('Step 3: Cipla Ltd Record Destruction & Issue Digital Certificate');
  await page.goto('http://localhost:3000/login');
  await page.click('#enter-manufacturer-btn');
  await page.waitForURL('**/manufacturer');

  // Also test Create Medicine Batch feature to demonstrate Section 3
  console.log('Testing Manufacturer Create Batch action...');
  await page.click('button:has-text("Create Medicine Batch")');
  await page.waitForSelector('text=Generate Medicine Batch & QR');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-05-cipla-create-batch-modal.png') });
  await page.click('button:has-text("Cancel")');

  // Go to pickups tab and find PCM2026A01
  await page.click('button:has-text("Confirmed Pickups")');
  await page.waitForSelector('text=PCM2026A01');

  // Click Record Destruction
  await page.click('button:has-text("Record Destruction")');
  await page.waitForSelector('button:has-text("Confirm Destruction Execution")');
  await page.click('button:has-text("Confirm Destruction Execution")');

  // Wait for Issue Certificate button
  const issueCertBtn = page.locator('button:has-text("Issue Certificate"), button:has-text("Issue MedTrace Digital Certificate")').first();
  await issueCertBtn.waitFor({ state: 'visible' });
  await issueCertBtn.click();

  // Certificate Modal appears
  await page.waitForSelector('text=Digital Destruction Certificate');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-06-cipla-certificate-issued.png') });
  await page.click('button:has-text("Done"), button:has-text("Close")');
  console.log('Step 3 Completed: Batch is DESTROYED and certificate is issued');

  // STEP 4: SWITCH TO CITY MEDICOS (DIFFERENT PHARMACY) & ATTEMPT SALE
  console.log('Step 4: City Medicos Illegal Sale Attempt (Cross-Pharmacy Re-entry)');
  await page.goto('http://localhost:3000/login');
  await page.selectOption('#retailer-org-select', '2'); // 2 = City Medicos
  await page.click('#enter-retailer-btn');
  await page.waitForURL('**/retailer');

  // Go to Sales / Dispense
  await page.goto('http://localhost:3000/retailer/dispense');
  await page.waitForSelector('button:has-text("Manual Batch Number Entry")');

  // Switch to manual batch entry
  await page.click('button:has-text("Manual Batch Number Entry")');
  await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');

  // First Attempt -> HIGH
  await page.click('button:has-text("Verify Sale")');
  await page.waitForSelector('h3:has-text("SALE BLOCKED")');
  await page.waitForSelector('text=SEVERITY: HIGH');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-07-citymedicos-sale-blocked-high.png') });
  console.log('Step 4A Completed: Sale blocked with HIGH severity');

  // Reset and verify second attempt -> CRITICAL escalation
  await page.click('button:has-text("Scan Another Package"), button:has-text("Verify Another Batch")');
  await page.click('button:has-text("Manual Batch Number Entry")');
  await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');
  await page.click('button:has-text("Verify Sale")');
  await page.waitForSelector('h3:has-text("SALE BLOCKED")');
  await page.waitForSelector('text=SEVERITY: CRITICAL');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-08-citymedicos-sale-blocked-critical.png') });
  console.log('Step 4B Completed: Escalated to CRITICAL severity');

  // STEP 5: SWITCH TO STATE DRUG CONTROLLER (REGULATOR) & INVESTIGATE
  console.log('Step 5: Regulator Command Center & Forensic Investigation');
  await page.goto('http://localhost:3000/login');
  await page.click('#enter-regulator-btn');
  await page.waitForURL('**/regulator');

  // Verify critical alert appears in Live Alerts
  await page.waitForSelector('text=PCM2026A01');
  await page.waitForSelector('text=CRITICAL');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-09-regulator-critical-alert.png') });

  // Click Investigate 360° on the PCM2026A01 alert
  const investigateLink = page.locator('a[href*="/batch/PCM2026A01"]').first();
  await investigateLink.click();
  await page.waitForURL('**/batch/PCM2026A01');

  // Verify Batch 360 shows complete timeline and evidence
  await page.waitForSelector('h1:has-text("PCM2026A01")');
  await page.waitForSelector('text=PERMANENT REGISTRY LOCKED (DESTROYED)');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-10-batch360-investigation.png') });

  // Click Evidence tab
  await page.click('button:has-text("Evidence")');
  await page.waitForSelector('text=/MedTrace Compliance Certificate|Official Compliance Certificate/');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'flow-11-batch360-evidence.png') });

  console.log('--- ALL 5 MASTER FLOW PHASES COMPLETED SUCCESSFULLY! ---');

  await browser.close();
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
