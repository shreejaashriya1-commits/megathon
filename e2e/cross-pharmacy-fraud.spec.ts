import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Cross-Pharmacy Re-Entry Fraud & Escalation @fraud @security', () => {
  test.beforeEach(async ({ request }) => {
    resetDatabase();

    // 1. Apollo initiates return
    const retRes = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
      },
    });
    const retJson = await retRes.json();
    const returnId = retJson.data.id;

    // 2. MedLine confirms pickup
    await request.post(`/api/returns/${returnId}/confirm`, {
      data: {
        qty_received: 100,
        distributor_org_id: ORG_IDS.MEDLINE,
      },
    });

    // 3. Cipla logs destruction
    const destRes = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.CIPLA,
        facility_name: 'Cipla Hazardous Incinerator Unit 4, Goa',
        qty_destroyed: 100,
      },
    });
    const destJson = await destRes.json();

    // 4. Cipla issues certificate -> batch becomes DESTROYED
    await request.post('/api/certificates', {
      data: {
        batch_number: 'PCM2026A01',
        destruction_id: destJson.data.id,
        actor_org_id: ORG_IDS.CIPLA,
      },
    });
  });

  test('Different pharmacy (City Medicos) attempting sale of destroyed batch is BLOCKED with alert attributed to City Medicos', async ({ page, request }) => {
    // 1. Log in as City Medicos
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.CITY_MEDICOS));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('h1:has-text("City Medicos")')).toBeVisible();

    // 2. Switch to Sell / Dispense simulator
    await page.click('button:has-text("Sell / Dispense")');
    await page.click('button:has-text("Manual Batch Number Entry")');

    // 3. Attempt sale of PCM2026A01
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');
    await page.click('button:has-text("Verify Sale")');

    // 4. Verify BLOCKED with SEVERITY: HIGH
    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=SEVERITY: HIGH')).toBeVisible();

    // 5. Verify alert generated in Regulator feed
    const alertsRes = await request.get('/api/alerts');
    const alertsJson = await alertsRes.json();
    const cityAlert = alertsJson.data.find((a: any) => a.batch_number === 'PCM2026A01');
    expect(cityAlert).toBeDefined();
    expect(cityAlert.attempted_by_org_id).toBe(ORG_IDS.CITY_MEDICOS);
    expect(cityAlert.severity).toBe('HIGH');

    // 6. Attempt second sale to trigger CRITICAL escalation
    await page.click('button:has-text("Scan Another Package"), button:has-text("Scan / Test Another Batch")');
    await page.click('button:has-text("Manual Batch Number Entry")');
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');
    await page.click('button:has-text("Verify Sale")');

    // Verify escalation to CRITICAL
    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=SEVERITY: CRITICAL')).toBeVisible();

    // Verify latest alert is CRITICAL
    const updatedAlertsRes = await request.get('/api/alerts');
    const updatedAlertsJson = await updatedAlertsRes.json();
    const criticalAlert = updatedAlertsJson.data.find((a: any) => a.batch_number === 'PCM2026A01' && a.severity === 'CRITICAL');
    expect(criticalAlert).toBeDefined();
  });
});
