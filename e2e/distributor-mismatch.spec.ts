import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Distributor Quantity Mismatch & Dispute Resolution @distributor', () => {
  let returnId: number;

  test.beforeEach(async ({ request }) => {
    resetDatabase();
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
        condition: 'Stock inspection',
      },
    });
    const json = await res.json();
    returnId = json.data.id;
  });

  test('Received quantity discrepancy triggers DISPUTED status and difference is visible', async ({ page, request }) => {
    // 1. Log in as MedLine Distributors
    await page.goto('/login');
    await page.click('#enter-distributor-btn');

    // 2. Open Pickup modal for PCM2026A01
    const returnRow = page.locator('tr:has-text("PCM2026A01")').first();
    await returnRow.locator('button:has-text("Confirm Pickup")').click();

    const modal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Verify & Confirm Physical Intake' }).first();
    await expect(modal).toBeVisible();

    // 3. Enter mismatched quantity: 90 instead of 100
    const qtyInput = modal.locator('input[type="number"]').first();
    await qtyInput.fill('90');

    // Verify UI warning appears
    await expect(modal.locator('text=Quantity Mismatch Detected')).toBeVisible();

    // 4. Submit confirmation with mismatch
    await modal.locator('button[type="submit"]:has-text("Log Intake Discrepancy (DISPUTED)"), button:has-text("Confirm Intake")').click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // 5. Verify batch in DB is now DISPUTED
    const batchRes = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const batchJson = await batchRes.json();
    expect(batchJson.data.status).toBe('DISPUTED');

    // 6. Switch to Disputes tab in UI
    await page.click('button:has-text("Disputes")');

    // Verify dispute row contains claimed: 100, received: 90, diff: -10
    const disputeRow = page.locator('div:has-text("PCM2026A01"), tr:has-text("PCM2026A01")').first();
    await expect(disputeRow).toBeVisible();
    await expect(disputeRow.locator('text=100').first()).toBeVisible();
    await expect(disputeRow.locator('text=90').first()).toBeVisible();
    await expect(disputeRow.locator('text=-10').first()).toBeVisible();

    // 7. Click "Resolve Dispute" button
    await disputeRow.locator('button:has-text("Resolve Dispute")').click();

    const resolveModal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Resolve Quantity Dispute' }).first();
    await expect(resolveModal).toBeVisible();

    // Correct quantity to 100 and submit resolution
    const resolveQtyInput = resolveModal.locator('input[type="number"]').first();
    await resolveQtyInput.fill('100');
    await resolveModal.locator('button[type="submit"]:has-text("Confirm Dispute Resolution"), button:has-text("Resolve Dispute")').click();

    await expect(resolveModal).not.toBeVisible({ timeout: 10000 });

    // 8. Verify status is now RETURN_CONFIRMED
    const finalBatchRes = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const finalBatchJson = await finalBatchRes.json();
    expect(finalBatchJson.data.status).toBe('RETURN_CONFIRMED');
  });
});
