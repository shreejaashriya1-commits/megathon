import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Regulatory Command Center & System-Wide Oversight @regulator @smoke', () => {
  test.beforeEach(async ({ request }) => {
    resetDatabase();

    // Trigger a blocked sale attempt to generate an alert
    await request.post('/api/sale-attempt', {
      data: {
        batch_number: 'AMX-DEMO-001',
        retailer_org_id: ORG_IDS.CITY_MEDICOS,
      },
    });
  });

  test('Regulator dashboard displays Live Alerts with honest near-real-time polling label', async ({ page }) => {
    await page.goto('/login');
    await page.click('#enter-regulator-btn');

    await expect(page).toHaveURL(/\/regulator/);
    await expect(page.locator('text="REGULATORY COMMAND DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("State Drug Controller")')).toBeVisible();

    // Verify polling indicator is labeled honestly
    await expect(page.locator('text="NEAR-REAL-TIME POLLING (3s)"').first()).toBeVisible();

    // Verify alert card for AMX-DEMO-001
    const alertCard = page.locator('div:has-text("AMX-DEMO-001")').first();
    await expect(alertCard).toBeVisible();
    await expect(alertCard.locator('span:has-text("HIGH")').first()).toBeVisible();
    await expect(alertCard.locator('text=City Medicos')).toBeVisible();

    // Verify "INVESTIGATE" button is present and navigates to Batch 360
    const investigateLink = alertCard.locator('a:has-text("INVESTIGATE"), button:has-text("INVESTIGATE")').first();
    await expect(investigateLink).toBeVisible();
    await investigateLink.click();

    await expect(page).toHaveURL(/\/batch\/AMX-DEMO-001/);
    await expect(page.locator('h1:has-text("AMX-DEMO-001")')).toBeVisible();
  });

  test('Regulator All Batches tab provides system-wide visibility across all stakeholders', async ({ page }) => {
    await page.goto('/login');
    await page.click('#enter-regulator-btn');

    // Switch to All Batches tab
    await page.click('button:has-text("All Batches")');

    // Verify both active and destroyed batches are visible
    await expect(page.locator('tr:has-text("PCM2026A01")').first()).toBeVisible();
    await expect(page.locator('tr:has-text("AMX-DEMO-001")').first()).toBeVisible();

    // Verify filter dropdown exists
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();
  });

  test('Regulator Batch Lookup navigates to Batch 360 view', async ({ page }) => {
    await page.goto('/login');
    await page.click('#enter-regulator-btn');

    // Switch to Lookup tab
    await page.click('button:has-text("Batch Lookup"), button:has-text("Lookup")');

    // Search for PCM2026A01
    const searchInput = page.locator('input[placeholder*="PCM2026A01" i], input[type="text"]').first();
    await searchInput.fill('PCM2026A01');
    await page.click('a:has-text("Investigate 360° Ledger"), a:has-text("Investigate 360°")');

    // Navigates to Batch 360
    await expect(page).toHaveURL(/\/batch\/PCM2026A01/);
    await expect(page.locator('h1:has-text("PCM2026A01")')).toBeVisible();
  });

  test('Regulator cannot modify batch lifecycle state directly', async ({ request }) => {
    // Regulator attempting to confirm return
    const res = await request.post('/api/returns/1/confirm', {
      data: {
        qty_received: 100,
        distributor_org_id: ORG_IDS.REGULATOR, // Regulator org ID
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Only authorized distributors');
  });
});
