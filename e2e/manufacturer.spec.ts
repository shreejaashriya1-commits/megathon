import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Manufacturer Destruction & Certificate Workflow @manufacturer @smoke @security', () => {
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
  });

  test('Manufacturer views confirmed pickup, logs incineration, and issues MedTrace Digital Destruction Certificate', async ({ page, request }) => {
    // 1. Log in as Cipla Ltd
    await page.goto('/login');
    await page.click('#enter-manufacturer-btn');

    await expect(page).toHaveURL(/\/manufacturer/);
    await expect(page.locator('text="MANUFACTURER DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("Cipla Ltd")')).toBeVisible();

    // 2. Find PCM2026A01 in Confirmed Pickups
    const pickupRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(pickupRow).toBeVisible();
    await expect(pickupRow.locator('text=100 units')).toBeVisible();

    // 3. Click "Schedule & Confirm Destruction"
    await pickupRow.locator('button:has-text("Schedule & Confirm Destruction"), button:has-text("Destruction")').first().click();

    // 4. Modal opens in Step 1: Log Destruction
    const modal = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'MedTrace Digital Destruction Protocol' }).first();
    await expect(modal).toBeVisible();

    // Facility name and qty 100 are pre-filled
    await expect(modal.locator('text=PCM2026A01').first()).toBeVisible();

    // Click "Confirm Destruction Execution"
    const recordBtn = modal.locator('button[type="submit"]:has-text("Confirm Destruction Execution"), button[type="submit"]:has-text("Record & Confirm")');
    await recordBtn.click();

    // 5. Modal advances to Step 2: Issue Certificate
    await expect(modal.locator('text=Certificate of Destruction').first()).toBeVisible();

    // Click "Issue Certificate & Lock Registry"
    const issueBtn = modal.locator('button:has-text("Issue Certificate & Lock Registry"), button:has-text("Issue Certificate Now")');
    await issueBtn.click();

    // 6. Step 3: Certificate Issued confirmation view
    await expect(modal.locator('text=MEDTRACE DIGITAL DESTRUCTION CERTIFICATE').first()).toBeVisible();
    await expect(modal.locator('text=MTC-2026-').first()).toBeVisible();

    // Close modal
    await modal.locator('button:has-text("Done & Return to Dashboard"), button:has-text("Done")').click();
    await expect(modal).not.toBeVisible();

    // 7. Verify batch in DB is DESTROYED
    const batchRes = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const batchJson = await batchRes.json();
    expect(batchJson.data.status).toBe('DESTROYED');

    // 8. Verify Certificates tab displays the newly issued certificate
    await page.click('button:has-text("Certificates Issued")');
    const certRow = page.locator('tr:has-text("PCM2026A01")').first();
    await expect(certRow).toBeVisible();
    await expect(certRow.locator('text=MTC-2026-')).toBeVisible();
  });

  test('Certificate cannot be issued before destruction record exists', async ({ request }) => {
    const res = await request.post('/api/certificates', {
      data: {
        batch_number: 'PCM2026A01',
        destruction_id: 99999, // Non-existent
        actor_org_id: ORG_IDS.CIPLA,
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('does not exist');
  });

  test('Duplicate destruction attempt on same batch is rejected', async ({ request }) => {
    // 1. Log destruction first time
    const res1 = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.CIPLA,
        facility_name: 'Test Incinerator',
        qty_destroyed: 100,
      },
    });
    expect(res1.status()).toBe(201);

    // 2. Second destruction attempt
    const res2 = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.CIPLA,
        facility_name: 'Test Incinerator 2',
        qty_destroyed: 100,
      },
    });
    expect(res2.status()).toBe(400);
    const json2 = await res2.json();
    expect(json2.success).toBe(false);
    expect(json2.error).toContain('Destruction already logged');
  });

  test('Terminal state enforcement: DESTROYED batch rejects all further reverse-chain transitions', async ({ request }) => {
    // 1. Progress to destruction & certificate
    const dRes = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.CIPLA,
        facility_name: 'Test Incinerator',
        qty_destroyed: 100,
      },
    });
    const dJson = await dRes.json();

    await request.post('/api/certificates', {
      data: {
        batch_number: 'PCM2026A01',
        destruction_id: dJson.data.id,
        actor_org_id: ORG_IDS.CIPLA,
      },
    });

    // 2. Verify return attempt is rejected
    const retRes = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
      },
    });
    expect(retRes.status()).toBe(400);
    const retJson = await retRes.json();
    expect(retJson.error).toContain('permanently DESTROYED');

    // 3. Verify duplicate certificate is rejected
    const certRes = await request.post('/api/certificates', {
      data: {
        batch_number: 'PCM2026A01',
        destruction_id: dJson.data.id,
        actor_org_id: ORG_IDS.CIPLA,
      },
    });
    expect(certRes.status()).toBe(400);
    const certJson = await certRes.json();
    expect(certJson.error).toContain('already DESTROYED');
  });
});
