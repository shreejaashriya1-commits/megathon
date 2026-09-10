import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Return Request Validation & Security Guards @retailer @security', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('Reject return request with zero quantity', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 0,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('positive integer');
  });

  test('Reject return request with negative quantity', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: -15,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('Reject return request exceeding available batch quantity', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 150, // Batch quantity is 100
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('cannot exceed batch quantity');
  });

  test('Reject return request for unknown batch number', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'NON-EXISTENT-BATCH',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 10,
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  test('Reject return request for permanently DESTROYED batch', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'AMX-DEMO-001', // Pre-seeded DESTROYED batch
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 50,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('permanently DESTROYED');
  });

  test('Reject return request for batch owned by a different pharmacy', async ({ request }) => {
    const res = await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01', // Owned by Apollo (Org ID 1)
        retailer_org_id: ORG_IDS.CITY_MEDICOS, // Attempted by City Medicos (Org ID 2)
        qty_claimed: 100,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not currently held by this retailer');
  });

  test('Verify database state remains unaltered after invalid return attempts', async ({ request }) => {
    const res = await request.get('/api/batches/resolve?qr_token=PCM2026A01-TOKEN');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data.quantity).toBe(100);
  });
});
