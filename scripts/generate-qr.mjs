import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qrDir = path.join(__dirname, '..', 'public', 'qr');
const demoDir = path.join(__dirname, '..', 'public', 'demo', 'evidence');

fs.mkdirSync(qrDir, { recursive: true });
fs.mkdirSync(demoDir, { recursive: true });

const tokens = [
  { token: 'AMX-DEMO-001-TOKEN', file: 'amx-demo-001.png' },
  { token: 'PCM2026A01-TOKEN', file: 'pcm2026a01.png' },
  { token: 'AZI-2026-088-TOKEN', file: 'azi-2026-088.png' },
  { token: 'MET-2026-045-TOKEN', file: 'met-2026-045.png' },
  { token: 'ATO-2026-012-TOKEN', file: 'ato-2026-012.png' },
  { token: 'PCM-EXP-999-TOKEN', file: 'pcm-exp-999.png' },
];

for (const item of tokens) {
  const filePath = path.join(qrDir, item.file);
  await QRCode.toFile(filePath, item.token, {
    width: 300,
    margin: 2,
    color: {
      dark: '#0f766e',
      light: '#ffffff',
    },
  });
  console.log(`Generated QR for ${item.token} at ${filePath}`);
}

console.log('All QR codes generated successfully.');
