import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Role-Based Multi-Tenant Data Isolation @security', () => {
  test.beforeEach(() => {
    resetDatabase();
  });

  test('Retailer inventory queries isolate batches strictly by current_holder_org_id', async ({ request }) => {
    // 1. Query batches as Apollo Pharmacy (Org ID 1)
    const apolloRes = await request.get(`/api/batches?org_id=${ORG_IDS.APOLLO}`);
    const apolloJson = await apolloRes.json();
    expect(apolloJson.success).toBe(true);

    // Apollo should see PCM2026A01
    const apolloBatchNumbers = apolloJson.data.map((b: any) => b.batch_number);
    expect(apolloBatchNumbers).toContain('PCM2026A01');

    // 2. Query batches as City Medicos (Org ID 2)
    const cityRes = await request.get(`/api/batches?org_id=${ORG_IDS.CITY_MEDICOS}`);
    const cityJson = await cityRes.json();
    expect(cityJson.success).toBe(true);

    // City Medicos should NOT see Apollo's batch PCM2026A01
    const cityBatchNumbers = cityJson.data.map((b: any) => b.batch_number);
    expect(cityBatchNumbers).not.toContain('PCM2026A01');
  });

  test('Retailer return requests isolate records by retailer_org_id', async ({ request }) => {
    // 1. Apollo creates a return request
    await request.post('/api/returns', {
      data: {
        batch_number: 'PCM2026A01',
        retailer_org_id: ORG_IDS.APOLLO,
        qty_claimed: 100,
      },
    });

    // 2. Apollo queries their returns -> should see 1 request
    const apolloReturns = await request.get(`/api/returns?org_id=${ORG_IDS.APOLLO}`);
    const apolloJson = await apolloReturns.json();
    expect(apolloJson.data.some((r: any) => r.batch_number === 'PCM2026A01')).toBe(true);

    // 3. City Medicos queries their returns -> should see 0 requests for PCM2026A01
    const cityReturns = await request.get(`/api/returns?org_id=${ORG_IDS.CITY_MEDICOS}`);
    const cityJson = await cityReturns.json();
    expect(cityJson.data.some((r: any) => r.batch_number === 'PCM2026A01')).toBe(false);
  });

  test('Regulator has un-isolated system-wide visibility across all batches', async ({ request }) => {
    // Regulator query without org_id filter returns all batches across the network
    const res = await request.get('/api/batches');
    const json = await res.json();
    expect(json.success).toBe(true);

    const allBatches = json.data.map((b: any) => b.batch_number);
    expect(allBatches).toContain('PCM2026A01'); // Held by Apollo
    expect(allBatches).toContain('AMX-DEMO-001'); // Destroyed by Cipla
    expect(allBatches).toContain('AZI-2026-088'); // Held by City Medicos
  });
});
