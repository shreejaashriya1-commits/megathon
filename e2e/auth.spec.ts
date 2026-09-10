import { test, expect } from '@playwright/test';
import { ORG_IDS, resetDatabase } from './helpers/test-helpers';

test.describe('Authentication & Persona Switching @auth @smoke', () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test('Login page renders all 4 stakeholder cards with correct titles and descriptions', async ({ page }) => {
    await page.goto('/login');

    // 1. Retailer card
    await expect(page.locator('h3:has-text("1. RETAILER")')).toBeVisible();
    await expect(page.locator('p:has-text("Pharmacy shelf")').first()).toBeVisible();
    await expect(page.locator('#enter-retailer-btn')).toBeVisible();

    // 2. Distributor card
    await expect(page.locator('h3:has-text("2. DISTRIBUTOR")')).toBeVisible();
    await expect(page.locator('p:has-text("Reverse logistics")').first()).toBeVisible();
    await expect(page.locator('#enter-distributor-btn')).toBeVisible();

    // 3. Manufacturer card
    await expect(page.locator('h3:has-text("3. MANUFACTURER")')).toBeVisible();
    await expect(page.locator('p:has-text("destruction obligation")').first()).toBeVisible();
    await expect(page.locator('#enter-manufacturer-btn')).toBeVisible();

    // 4. Regulator card
    await expect(page.locator('h3:has-text("4. REGULATOR")')).toBeVisible();
    await expect(page.locator('p:has-text("Oversight and investigation")').first()).toBeVisible();
    await expect(page.locator('#enter-regulator-btn')).toBeVisible();
  });

  test('Retailer login as Apollo Pharmacy - Ajmer routes to Retailer Dashboard with isolated context', async ({ page }) => {
    await page.goto('/login');

    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('text="RETAILER DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("Apollo Pharmacy - Ajmer")')).toBeVisible();

    const savedOrgId = await page.evaluate(() => localStorage.getItem('medtrace_org_id'));
    expect(savedOrgId).toBe(String(ORG_IDS.APOLLO));
  });

  test('Retailer login as City Medicos switches active organization context', async ({ page }) => {
    await page.goto('/login');

    await page.selectOption('#retailer-org-select', String(ORG_IDS.CITY_MEDICOS));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('h1:has-text("City Medicos")')).toBeVisible();

    const savedOrgId = await page.evaluate(() => localStorage.getItem('medtrace_org_id'));
    expect(savedOrgId).toBe(String(ORG_IDS.CITY_MEDICOS));
  });

  test('Retailer login as Sunrise Pharmacy switches active organization context', async ({ page }) => {
    await page.goto('/login');

    await page.selectOption('#retailer-org-select', String(ORG_IDS.SUNRISE));
    await page.click('#enter-retailer-btn');

    await expect(page).toHaveURL(/\/retailer/);
    await expect(page.locator('h1:has-text("Sunrise Pharmacy")')).toBeVisible();
  });

  test('Distributor login as MedLine Distributors routes to Distributor Dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.click('#enter-distributor-btn');

    await expect(page).toHaveURL(/\/distributor/);
    await expect(page.locator('text="DISTRIBUTOR DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("MedLine Distributors")')).toBeVisible();

    const savedOrgId = await page.evaluate(() => localStorage.getItem('medtrace_org_id'));
    expect(savedOrgId).toBe(String(ORG_IDS.MEDLINE));
  });

  test('Manufacturer login as Cipla Ltd routes to Manufacturer Dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.click('#enter-manufacturer-btn');

    await expect(page).toHaveURL(/\/manufacturer/);
    await expect(page.locator('text="MANUFACTURER DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("Cipla Ltd")')).toBeVisible();

    const savedOrgId = await page.evaluate(() => localStorage.getItem('medtrace_org_id'));
    expect(savedOrgId).toBe(String(ORG_IDS.CIPLA));
  });

  test('Regulator login routes directly to Regulatory Command Dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.click('#enter-regulator-btn');

    await expect(page).toHaveURL(/\/regulator/);
    await expect(page.locator('text="REGULATORY COMMAND DASHBOARD"').first()).toBeVisible();
    await expect(page.locator('h1:has-text("State Drug Controller")')).toBeVisible();

    const savedOrgId = await page.evaluate(() => localStorage.getItem('medtrace_org_id'));
    expect(savedOrgId).toBe(String(ORG_IDS.REGULATOR));
  });

  test('Active persona and role context survive page refresh', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#retailer-org-select', String(ORG_IDS.APOLLO));
    await page.click('#enter-retailer-btn');

    await expect(page.locator('h1:has-text("Apollo Pharmacy - Ajmer")')).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify still Apollo
    await expect(page.locator('h1:has-text("Apollo Pharmacy - Ajmer")')).toBeVisible();
    await expect(page.locator('text="RETAILER DASHBOARD"').first()).toBeVisible();
  });
});
