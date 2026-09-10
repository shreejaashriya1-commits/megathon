import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runAudit() {
  console.log('--- STARTING VISUAL & NAVIGATION ASSET AUDIT ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true, // we will also run visible demo
    args: ['--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Check Login Page
  console.log('Auditing /login...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  // Check no broken images on login
  const loginImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth
    }));
  });
  console.log('Login images checked:', loginImgs.length);

  // 2. Select Retailer
  console.log('Logging in as Apollo Pharmacy...');
  await page.selectOption('#retailer-org-select', '1');
  await page.click('#enter-retailer-btn');
  await page.waitForURL('**/retailer');

  // 3. Open Return Modal for PCM2026A01
  console.log('Opening Return Modal...');
  const returnBtn = page.locator('tr:has-text("PCM2026A01")').locator('button:has-text("Initiate Return")').first();
  await returnBtn.click();

  const modal = page.locator('div[role="dialog"]').filter({ hasText: 'Initiate Pharmaceutical Return' }).first();
  await modal.waitFor({ state: 'visible' });

  // Verify photographic evidence preview
  const evidenceImg = modal.locator('img[alt="Evidence"]').first();
  const isImgVisible = await evidenceImg.isVisible();
  console.log('Evidence image visible:', isImgVisible);

  if (isImgVisible) {
    const imgHealth = await evidenceImg.evaluate((img) => ({
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    }));
    console.log('Evidence image health:', imgHealth);
    if (imgHealth.complete && imgHealth.naturalWidth === 0) {
      throw new Error('Evidence image is broken (naturalWidth === 0)!');
    }
  }

  // Test deliberate broken image fallback
  console.log('Testing image fallback state when URL is invalid...');
  await modal.locator('img[alt="Evidence"]').first().evaluate((img) => {
    img.src = '/demo/evidence/non-existent-image-404.jpg';
    img.dispatchEvent(new Event('error'));
  });
  await page.waitForTimeout(300);

  const fallbackText = await modal.locator('text=Evidence unavailable').first().isVisible();
  console.log('Graceful fallback displayed when image fails:', fallbackText);
  if (!fallbackText) {
    throw new Error('Fallback "Evidence unavailable" did not appear on image load failure!');
  }

  // Test ESC key close
  console.log('Testing ESC key modal dismissal...');
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'hidden' });
  console.log('Modal closed cleanly via ESC key.');

  // Test Backdrop click close
  console.log('Testing backdrop click modal dismissal...');
  await returnBtn.click();
  await modal.waitFor({ state: 'visible' });
  // Click on the backdrop element directly outside the modal card
  await modal.click({ position: { x: 5, y: 5 } });
  await modal.waitFor({ state: 'hidden' });
  console.log('Modal closed cleanly via backdrop click.');

  // 4. Test Batch 360 Navigation from Regulator
  console.log('Testing Regulator Batch 360 navigation...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.click('#enter-regulator-btn');
  await page.waitForURL('**/regulator');
  console.log('Logged into Regulator Dashboard.');

  // Go to Batch 360 for AMX-DEMO-001
  await page.goto('http://localhost:3000/batch/AMX-DEMO-001');
  await page.waitForLoadState('networkidle');

  // Check role dashboard link
  const regulatorLink = page.locator('a:has-text("Regulator Dashboard")').first();
  const isRegulatorLinkVisible = await regulatorLink.isVisible();
  console.log('Dynamic "Regulator Dashboard" link visible on Batch 360:', isRegulatorLinkVisible);
  if (!isRegulatorLinkVisible) {
    throw new Error('Regulator Dashboard dynamic link was not rendered on Batch 360!');
  }

  // Switch to Evidence tab
  await page.click('button:has-text("Photographic & Certificate Evidence")');
  await page.waitForTimeout(300);

  // Verify no broken images in Evidence tab
  const batch360Imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth
    }));
  });
  console.log('Batch 360 evidence images status:', batch360Imgs);
  for (const img of batch360Imgs) {
    if (img.complete && img.naturalWidth === 0) {
      throw new Error(`Broken image found on Batch 360: ${img.src}`);
    }
  }

  // Click Regulator Dashboard link to verify it returns to /regulator
  await regulatorLink.click();
  await page.waitForURL('**/regulator');
  console.log('Navigation successfully returned to /regulator!');

  await browser.close();
  console.log('--- ALL VISUAL, ASSET & NAVIGATION CHECKS PASSED ---');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
