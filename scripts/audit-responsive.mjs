import { chromium } from '@playwright/test';

const viewports = [
  { name: 'Mobile (iPhone SE)', width: 375, height: 667 },
  { name: 'Tablet (iPad)', width: 768, height: 1024 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Desktop (Full HD)', width: 1920, height: 1080 }
];

const routes = [
  '/login',
  '/retailer',
  '/distributor',
  '/manufacturer',
  '/regulator',
  '/batch/PCM2026A01'
];

async function runResponsiveAudit() {
  console.log('--- STARTING RESPONSIVE & HORIZONTAL OVERFLOW AUDIT ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of routes) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState('networkidle');

      // Check horizontal overflow (scrollWidth > clientWidth)
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Check console errors or broken images
      const brokenImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          .filter(img => img.complete && img.naturalWidth === 0)
          .map(img => img.src);
      });

      console.log(`  Route ${route}: overflow=${hasHorizontalOverflow}, brokenImages=${brokenImages.length}`);
      if (hasHorizontalOverflow) {
        console.warn(`    WARNING: Horizontal overflow detected on ${route} at ${vp.width}px!`);
      }
      if (brokenImages.length > 0) {
        throw new Error(`Broken images detected on ${route}: ${brokenImages.join(', ')}`);
      }
    }
  }

  await browser.close();
  console.log('\n--- RESPONSIVE AUDIT FINISHED ---');
}

runResponsiveAudit().catch(err => {
  console.error('Responsive audit error:', err);
  process.exit(1);
});
