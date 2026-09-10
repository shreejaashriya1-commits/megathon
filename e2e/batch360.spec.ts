import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Batch 360° Closed-Loop Investigation @batch360', () => {
  test.beforeEach(async ({ request }) => {
    resetDatabase();

    // 1. Apollo return
    const retRes = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
        condition: 'Expired pharmacy inventory',
      },
    });
    const retJson = await retRes.json();
    const returnId = retJson.data.id;

    // 2. MedLine pickup
    await request.post(`/api/returns/${returnId}/confirm`, {
      data: {
        qty_received: 100,
        distributor_org_id: ORG_IDS.MEDLINE,
      },
    });

    // 3. Cipla destruction
    const destRes = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.CIPLA,
        facility_name: 'Cipla Hazardous Incineration Facility Unit 4, Goa',
        qty_destroyed: 100,
        evidence: '/demo/evidence/amx-incineration.jpg',
      },
    });
    const destJson = await destRes.json();

    // 4. Cipla certificate
    await request.post('/api/certificates', {
      data: {
        batch_number: 'PCM2026A01',
        destruction_id: destJson.data.id,
        actor_org_id: ORG_IDS.CIPLA,
      },
    });

    // 5. City Medicos illegal sale attempt
    await request.post('/api/sale-attempt', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.CITY_MEDICOS,
      },
    });
  });

  test('Batch 360 renders complete dynamic database-derived audit trail with evidence', async ({ page }) => {
    await page.goto('/batch/PCM2026A01');

    // 1. Verify batch header metadata
    await expect(page.locator('h1:has-text("PCM2026A01")')).toBeVisible();
    await expect(page.locator('text=PERMANENT REGISTRY LOCKED (DESTROYED)').first()).toBeVisible();

    // 2. Verify Digital Ledger Timeline events
    // Event: Return Initiated
    await expect(page.locator('text=/Reverse Return Initiated|Return Initiated/i').first()).toBeVisible();
    await expect(page.locator('main').locator('text=Apollo Pharmacy - Ajmer').first()).toBeVisible();

    // Event: Pickup Confirmed
    await expect(page.locator('text=/Distributor Custody Verified|RETURN_CONFIRMED/i').first()).toBeVisible();
    await expect(page.locator('main').locator('text=MedLine Distributors').first()).toBeVisible();

    // Event: Destruction Logged
    await expect(page.locator('text=/Hazardous Destruction Executed|DESTRUCTION LOGGED/i').first()).toBeVisible();
    await expect(page.locator('main').locator('text=Cipla Ltd').first()).toBeVisible();

    // Event: Certificate Issued
    await expect(page.locator('text=/Destruction Certificate Issued|DESTROYED/i').first()).toBeVisible();
    await expect(page.locator('text=MTC-2026-').first()).toBeVisible();

    // Event: Sale Blocked
    await expect(page.locator('text=/Sale Attempt Blocked|SALE BLOCKED/i').first()).toBeVisible();
    await expect(page.locator('main').locator('text=City Medicos').first()).toBeVisible();

    // 3. Switch to Chain-of-Custody Evidence tab
    await page.click('button:has-text("Evidence")');

    // Verify linked evidence
    await expect(page.locator('text=/MedTrace Compliance Certificate|Official Compliance Certificate/').first()).toBeVisible();
    await expect(page.locator('text=MTC-2026-').first()).toBeVisible();
    await expect(page.locator('img[alt="Destruction Evidence"]').first()).toBeVisible();
  });
});
