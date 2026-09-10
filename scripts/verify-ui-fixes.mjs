import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = 'C:\\Users\\saipr\\.gemini\\antigravity-ide\\brain\\30a1b525-3839-485d-8ba2-f51ba0f5ec3f';

async function captureVerificationScreenshots() {
  console.log('Launching Chrome via Playwright to capture verification screenshots...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  try {
    // 1. Desktop Context for Retailer & Regulator
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Screen 1: Retailer Camera & QR Scanner
    console.log('Capturing Retailer QR Scanner...');
    await page.goto('http://localhost:3000/login');
    await page.click('#enter-retailer-btn');
    await page.waitForURL('**/retailer*');
    await page.goto('http://localhost:3000/retailer?tab=qr');
    await page.waitForTimeout(1000);
    const retailerQrPath = path.join(artifactsDir, 'retailer-qr-camera.png');
    await page.screenshot({ path: retailerQrPath, fullPage: true });
    console.log(`Saved ${retailerQrPath}`);

    // Screen 2: Regulator Live Alerts with Status Filters
    console.log('Capturing Regulator Live Alerts with Status Filters...');
    await page.goto('http://localhost:3000/login');
    await page.click('#enter-regulator-btn');
    await page.waitForURL('**/regulator*');
    await page.waitForTimeout(1000);
    const regulatorAlertsPath = path.join(artifactsDir, 'regulator-live-alerts-fixed.png');
    await page.screenshot({ path: regulatorAlertsPath, fullPage: true });
    console.log(`Saved ${regulatorAlertsPath}`);

    // Screen 3: Regulator Batch Lookup
    console.log('Capturing Regulator Batch Lookup...');
    await page.click('button:has-text("Batch Lookup"), button:has-text("Lookup")');
    await page.waitForTimeout(500);
    const searchInput = page.locator('input[placeholder*="PCM2026A01" i], input[type="text"]').first();
    await searchInput.fill('PCM2026A01');
    await page.waitForTimeout(500);
    const regulatorLookupPath = path.join(artifactsDir, 'regulator-lookup-fixed.png');
    await page.screenshot({ path: regulatorLookupPath, fullPage: true });
    console.log(`Saved ${regulatorLookupPath}`);

    await context.close();

    // 2. Mobile Context (iPhone 14 / modern smartphone: 390x844)
    console.log('Capturing Mobile Responsive View (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('http://localhost:3000/login');
    await mobilePage.click('#enter-retailer-btn');
    await mobilePage.waitForURL('**/retailer*');
    await mobilePage.waitForTimeout(1000);
    const mobileRetailerPath = path.join(artifactsDir, 'mobile-retailer-responsive.png');
    await mobilePage.screenshot({ path: mobileRetailerPath, fullPage: false });
    console.log(`Saved ${mobileRetailerPath}`);

    // Mobile Menu Open
    const menuBtn = mobilePage.locator('header button[aria-label="Toggle navigation menu"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(500);
      const mobileMenuPath = path.join(artifactsDir, 'mobile-menu-drawer.png');
      await mobilePage.screenshot({ path: mobileMenuPath, fullPage: false });
      console.log(`Saved ${mobileMenuPath}`);
    }

    await mobileContext.close();

    console.log('All verification screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

captureVerificationScreenshots().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
