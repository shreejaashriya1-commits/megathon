import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Cross-Pharmacy Return Prohibition @retailer @security', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('City Medicos cannot see or initiate return on batch held by Apollo Pharmacy', async ({ page, request }) => {
    // 1. Log in as City Medicos
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.CITY_MEDICOS));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('h1:has-text("City Medicos")')).toBeVisible();

    // 2. Verify PCM2026A01 does NOT appear in City Medicos inventory table
    const pcmRow = page.locator('tr:has-text("PCM2026A01")');
    await expect(pcmRow).toHaveCount(0);

    // 3. Attempt direct API request from City Medicos targeting PCM2026A01
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.CITY_MEDICOS,
        qty_claimed: 100,
        condition: 'Malicious attempt',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not currently held by this retailer');

    // 4. Verify batch in DB is completely intact and still held by Apollo
    const checkRes = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const checkBody = await checkRes.json();
    expect(checkBody.data.status).toBe('ACTIVE');
    expect(checkBody.data.current_holder_org_id).toBe(ORG_IDS.APOLLO);
  });
});
