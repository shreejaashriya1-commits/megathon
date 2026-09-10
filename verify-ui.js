const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching visible Google Chrome...');
  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
    });
  } catch (err) {
    console.warn('Could not launch channel chrome, falling back to default chromium (headless: false)...');
    browser = await chromium.launch({
      headless: false,
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'homepage-redirect-retailer.png'), fullPage: false });
  console.log('Captured homepage-redirect-retailer.png');

  console.log('2. Navigating to http://localhost:3000/retailer ...');
  await page.goto('http://localhost:3000/retailer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'retailer-dashboard-verified.png'), fullPage: false });
  console.log('Captured retailer-dashboard-verified.png');

  console.log('3. Authenticating as Distributor (MedLine Distributors)...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.click('#enter-distributor-btn');
  await page.waitForURL('**/distributor', { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'distributor-dashboard.png'), fullPage: false });
  console.log('Captured distributor-dashboard.png');

  console.log('4. Authenticating as Manufacturer (Cipla Ltd)...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.click('#enter-manufacturer-btn');
  await page.waitForURL('**/manufacturer', { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'manufacturer-dashboard.png'), fullPage: false });
  console.log('Captured manufacturer-dashboard.png');

  console.log('5. Authenticating as Regulator (State Drug Controller)...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.click('#enter-regulator-btn');
  await page.waitForURL('**/regulator', { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'regulator-dashboard.png'), fullPage: false });
  console.log('Captured regulator-dashboard.png');

  console.log('6. Navigating to http://localhost:3000/batch/PCM2026A01 ...');
  await page.goto('http://localhost:3000/batch/PCM2026A01', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'batch-360-ledger.png'), fullPage: false });
  console.log('Captured batch-360-ledger.png');

  console.log('7. Returning to Retailer and capturing final view...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.click('#enter-retailer-btn');
  await page.waitForURL('**/retailer', { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, 'retailer-final.png'), fullPage: false });
  console.log('Captured retailer-final.png');

  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
  await browser.close();
}

run().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
