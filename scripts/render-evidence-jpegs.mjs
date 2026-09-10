import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoDir = path.join(__dirname, '..', 'public', 'demo', 'evidence');

async function renderJpegs() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });

  const files = [
    { svg: 'amx-return.svg', jpg: 'amx-return.jpg' },
    { svg: 'amx-incineration.svg', jpg: 'amx-incineration.jpg' }
  ];

  for (const f of files) {
    const svgPath = path.join(demoDir, f.svg);
    const jpgPath = path.join(demoDir, f.jpg);
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    await page.setContent(svgContent);
    const buffer = await page.screenshot({ type: 'jpeg', quality: 90 });
    fs.writeFileSync(jpgPath, buffer);
    console.log(`Rendered binary JPEG: ${f.jpg} (${buffer.length} bytes)`);
  }

  await browser.close();
}

renderJpegs().catch(err => {
  console.error('Error rendering JPEGs:', err);
  process.exit(1);
});
