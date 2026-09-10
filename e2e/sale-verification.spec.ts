import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Sale Verification & Fraud Engine @fraud @retailer @smoke', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('Attempting sale of permanently DESTROYED batch (AMX-DEMO-001) is BLOCKED with certificate reference', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    // Go to Sell / Dispense tab
    await page.click('button:has-text("Sell / Dispense")');

    // Switch to Manual Batch Number Entry
    await page.click('button:has-text("Manual Batch Number Entry")');

    // Enter AMX-DEMO-001 and click Verify Sale
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'AMX-DEMO-001');
    await page.click('button:has-text("Verify Sale")');

    // Verify BLOCKED result card appears
    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=DEFENSE TRIGGERED')).toBeVisible();
    await expect(page.locator('text=SEVERITY: HIGH')).toBeVisible();
    await expect(page.locator('text=DC-DEMO-001').first()).toBeVisible();
  });

  test('Attempting sale of expired ACTIVE batch (PCM2026A01) triggers WARNING and BLOCKS sale', async ({ page }) => {
    await page.goto('/retailer/dispense');

    // Switch to manual batch entry
    await page.click('button:has-text("Manual Batch Number Entry")');

    // Enter expired batch PCM2026A01
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'PCM2026A01');
    await page.click('button:has-text("Verify Sale")');

    // Verification blocks sale with WARNING
    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=WARNING - expired batch, sale blocked')).toBeVisible();
  });

  test('Attempting sale of unknown batch number is BLOCKED', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await page.click('button:has-text("Sell / Dispense")');
    await page.click('button:has-text("Manual Batch Number Entry")');

    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'FAKE-BATCH-999');
    await page.click('button:has-text("Verify Sale")');

    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=Unknown batch number')).toBeVisible();
  });

  test('Attempting sale of valid active non-expired batch is ALLOWED', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await page.click('button:has-text("Sell / Dispense")');
    await page.click('button:has-text("Manual Batch Number Entry")');

    // AZI-2026-088 is a valid active non-expired batch
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'AZI-2026-088');
    await page.click('button:has-text("Verify Sale")');

    await expect(page.locator('h3:has-text("SALE ALLOWED")')).toBeVisible();
    await expect(page.locator('text=VERIFIED & UNEXPIRED')).toBeVisible();
  });
});
