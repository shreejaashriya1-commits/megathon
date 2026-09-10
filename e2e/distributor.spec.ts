import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Distributor Logistics Intake & Verification @distributor @smoke', () => {
  test.beforeEach(async ({ request }) => {
    resetDatabase();
    // Pre-create return request for PCM2026A01 by Apollo Pharmacy
    await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
        condition: 'Expired pharmacy stock',
      },
    });
  });

  test('MedLine Distributors confirms exact quantity pickup and transitions batch to RETURN_CONFIRMED', async ({ page, request }) => {
    // 1. Log in as MedLine Distributors
    await page.goto('/login');
    await page.click('#enter-distributor-btn');

    await expect(page).toHaveURL(/\/distributor/);
    await expect(page.locator('text="DISTRIBUTOR DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("MedLine Distributors")')).toBeVisible();

    // 2. Verify tabs
    await expect(page.locator('button:has-text("Incoming Returns")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Confirmed Pickups")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Disputes")').first()).toBeVisible();

    // 3. Find PCM2026A01 in Incoming Returns table
    const returnRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(returnRow).toBeVisible();
    await expect(returnRow.locator('text=100 units')).toBeVisible();
    await expect(returnRow.locator('text=Apollo Pharmacy - Ajmer')).toBeVisible();

    // 4. Click "Confirm Pickup"
    await returnRow.locator('button:has-text("Confirm Pickup")').click();

    // 5. Modal appears with claimed 100
    const modal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Verify & Confirm Physical Intake' }).first();
    await expect(modal).toBeVisible();

    // Confirm intake with 100
    const confirmBtn = modal.locator('button[type="submit"]:has-text("Confirm Pickup (RETURN_CONFIRMED)"), button:has-text("Confirm Intake")').first();
    await confirmBtn.click();

    // 6. Modal closes
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // 7. Verify API / Database reflects RETURN_CONFIRMED
    const checkBatch = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const batchJson = await checkBatch.json();
    expect(batchJson.data.status).toBe('RETURN_CONFIRMED');

    // 8. Verify item appears in Confirmed Pickups tab
    await page.click('button:has-text("Confirmed Pickups")');
    const confirmedRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(confirmedRow).toBeVisible();

    // 9. Refresh page and verify persistence
    await page.reload();
    await page.click('button:has-text("Confirmed Pickups")');
    await expect(page.locator('tr:has-text("PCM2026A01")').first()).toBeVisible();
  });
});
