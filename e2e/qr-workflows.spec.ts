import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('QR Token Resolution & Manual Fallback @qr', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('Valid QR token (PCM2026A01-TOKEN) resolves correct batch metadata', async ({ request }) => {
    const res = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.batch_number).toBe('PCM2026A01');
    expect(json.data.quantity).toBe(100);
    expect(json.data.status).toBe('ACTIVE');
  });

  test('QR token for destroyed batch (AMX-DEMO-001-TOKEN) resolves with DESTROYED status', async ({ request }) => {
    const res = await request.get('/api/batches/resolve?qr_token=AMX-DEMO-001-TOKEN');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.batch_number).toBe('AMX-DEMO-001');
    expect(json.data.status).toBe('DESTROYED');
  });

  test('Unrecognized or invalid QR token returns 404 not found', async ({ request }) => {
    const res = await request.get('/api/batches/resolve?qr_token=UNKNOWN-INVALID-TOKEN');
    expect(res.status()).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/no batch found/i);
  });

  test('Malformed QR token query returns 400 bad request', async ({ request }) => {
    const res = await request.get('/api/batches/resolve');
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('qr_token query parameter is required');
  });

  test('Manual batch input in Sell Simulator yields identical server validation as QR scan', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await page.click('button:has-text("Sell / Dispense")');
    await page.click('button:has-text("Manual Batch Number Entry")');

    // Enter AMX-DEMO-001 manually
    await page.fill('input[placeholder*="AMX-DEMO-001" i]', 'AMX-DEMO-001');
    await page.click('button:has-text("Verify Sale")');

    // Verification blocks sale with exact destroyed certificate DC-DEMO-001
    await expect(page.locator('h3:has-text("SALE BLOCKED")')).toBeVisible();
    await expect(page.locator('text=DC-DEMO-001').first()).toBeVisible();
  });
});
