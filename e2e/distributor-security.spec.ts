import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Distributor Role Boundaries & API Security @distributor @security', () => {
  let returnId: number;

  test.beforeEach(async ({ request }) => {
    resetDatabase();
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
      },
    });
    const json = await res.json();
    returnId = json.data.id;
  });

  test('Distributor cannot initiate retailer return request', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.MEDLINE, // Distributor attempting to initiate return
        qty_claimed: 100,
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Only authorized retail pharmacies');
  });

  test('Retailer cannot confirm distributor pickup', async ({ request }) => {
    const res = await request.post(`/api/returns/${returnId}/confirm`, {
      data: {
        qty_received: 100,
        distributor_org_id: ORG_IDS.APOLLO, // Retailer attempting pickup confirmation
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Only authorized distributors');
  });

  test('Non-distributor cannot resolve dispute', async ({ request }) => {
    // 1. Create dispute first
    await request.post(`/api/returns/${returnId}/confirm`, {
      data: {
        qty_received: 80,
        distributor_org_id: ORG_IDS.MEDLINE,
      },
    });

    // 2. Retailer attempts dispute resolution
    const res = await request.post(`/api/disputes/${returnId}/resolve`, {
      data: {
        corrected_qty: 100,
        distributor_org_id: ORG_IDS.APOLLO, // Unauthorized caller
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Only authorized distributors');
  });

  test('Manufacturer cannot directly destroy DISPUTED batch', async ({ request }) => {
    // Put batch in DISPUTED state
    await request.post(`/api/returns/${returnId}/confirm`, {
      data: {
        qty_received: 85,
        distributor_org_id: ORG_IDS.MEDLINE,
      },
    });

    // Attempt destruction
    const res = await request.post('/api/destructions', {
      data: {
        batch_number: 'PCM2026A01',
        manufacturer_org_id: ORG_IDS.CIPLA,
        facility_name: 'Test Incinerator',
        qty_destroyed: 85,
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Only \'RETURN_CONFIRMED\' batches can be destroyed');
  });
});
