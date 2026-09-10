import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Retailer Inventory & Return Flow @retailer @smoke', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('Apollo Pharmacy inventory displays PCM2026A01 as EXPIRED and ACTIVE', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);

    // Verify tabs
    await expect(page.locator('button:has-text("Inventory")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Return Requests")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sell / Dispense")').first()).toBeVisible();

    // Verify PCM2026A01 row
    const batchRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(batchRow).toBeVisible();

    // Verify product name, quantity 100, ACTIVE status, and EXPIRED badge
    await expect(batchRow.locator('text=100 units')).toBeVisible();
    await expect(batchRow.locator('text=ACTIVE')).toBeVisible();
    await expect(batchRow.locator('text=EXPIRED')).toBeVisible();

    // Verify Initiate Return button exists for this expired stock
    await expect(batchRow.locator('button:has-text("Initiate Return")')).toBeVisible();
  });

  test('Initiating return for PCM2026A01 transitions status to RETURN_INITIATED and persists across refresh', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    // Click "Initiate Return" on PCM2026A01
    const batchRow = page.locator('tr:has-text("PCM2026A01")').first();
    await batchRow.locator('button:has-text("Initiate Return")').click();

    // Verify Return Modal opens
    const modal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Initiate Pharmaceutical Return' }).first();
    await expect(modal).toBeVisible();

    // Verify batch and quantity inputs
    const batchInput = modal.locator('input[placeholder*="Batch" i], input[value*="PCM2026A01"]').first();
    await expect(batchInput).toHaveValue('PCM2026A01');

    // Submit return request
    const submitBtn = modal.locator('button[type="submit"]:has-text("Confirm Return Initiation"), button[type="submit"]:has-text("Submit Return Request")').first();
    await submitBtn.click();

    // Modal should close upon success
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify status in table updated to RETURN INITIATED
    const updatedRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(updatedRow.locator('text=/RETURN.?INITIATED/i')).toBeVisible();

    // Switch to Return Requests tab
    await page.click('button:has-text("Return Requests")');

    // Verify return request card appears
    const returnCard = page.locator('div:has-text("PCM2026A01")').filter({ hasText: '100 units' }).first();
    await expect(returnCard).toBeVisible();

    // Refresh page to verify persistence
    await page.reload();

    // Verify status persists
    await expect(page.locator('tr:has-text("PCM2026A01")').locator('text=/RETURN.?INITIATED/i')).toBeVisible();
  });
});
