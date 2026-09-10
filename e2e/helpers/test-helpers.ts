import { Page, APIRequestContext, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

export const ORG_IDS = {
  APOLLO: 1,      // Apollo Pharmacy - Ajmer (Retailer)
  CITY_MEDICOS: 2,// City Medicos (Retailer)
  SUNRISE: 3,     // Sunrise Pharmacy (Retailer)
  MEDLINE: 4,     // MedLine Distributors (Distributor)
  CIPLA: 5,       // Cipla Ltd (Manufacturer)
  REGULATOR: 6,   // State Drug Controller (Regulator)
};

export const BATCHES = {
  PCM: 'PCM2026A01',
  AMX_DESTROYED: 'AMX-DEMO-001',
  AZI_ACTIVE: 'AZI-2026-003',
};

/**
 * Resets the local MedTrace database to clean seed state
 */
export function resetDatabase() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'seed-db.mjs');
    execSync(`node "${scriptPath}"`, { stdio: 'pipe' });
  } catch (err: any) {
    console.error('Database reset failed:', err.message);
    throw err;
  }
}

/**
 * Injects persona organization into localStorage and reloads
 */
export async function setPersona(page: Page, orgId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('medtrace_org_id', String(id));
  }, orgId);
}
