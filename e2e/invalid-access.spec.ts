import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Invalid Access & Role Protection @auth @security', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('Direct navigation to /distributor without distributor role redirects to /login', async ({ page }) => {
    // Set persona to Retailer (Apollo ID 1)
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');
    await expect(page).toHaveURL(/\/retailer/);

    // Attempt direct navigation to /distributor
    await page.goto('/distributor');

    // Should redirect to /login due to role mismatch guard
    await expect(page).toHaveURL(/\/login/);
  });

  test('Direct navigation to /manufacturer without manufacturer role redirects to /login', async ({ page }) => {
    // Set persona to Retailer
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    // Attempt direct navigation to /manufacturer
    await page.goto('/manufacturer');

    await expect(page).toHaveURL(/\/login/);
  });

  test('Direct navigation to /regulator without regulator role redirects to /login', async ({ page }) => {
    // Set persona to Retailer
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    // Attempt direct navigation to /regulator
    await page.goto('/regulator');

    await expect(page).toHaveURL(/\/login/);
  });

  test('API rejects return request with distributor organization ID', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.MEDLINE, // Distributor org ID, not a retailer
        qty_claimed: 50,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only authorized retail pharmacies');
  });

  test('API rejects return confirmation from retailer organization ID', async ({ request }) => {
    const res = await request.post('/api/returns/1/confirm', {
      data: {
        qty_received: 100,
        distributor_org_id: ORG_IDS.APOLLO, // Retailer org ID, not a distributor
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only authorized distributors');
  });

  test('API rejects destruction logging from retailer organization ID', async ({ request }) => {
    const res = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.APOLLO, // Retailer org ID, not a manufacturer
        facility_name: 'Unauthorized Facility',
        qty_destroyed: 100,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only authorized manufacturers');
  });

  test('API rejects certificate issuance from distributor organization ID', async ({ request }) => {
    const res = await request.post('/api/certificates', {
      data: {
        batch_number: 'PCM2026A01',
        destruction_id: 1,
        actor_org_id: ORG_IDS.MEDLINE, // Distributor org ID, not a manufacturer
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only authorized manufacturers');
  });
});
