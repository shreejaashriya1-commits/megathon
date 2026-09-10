import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoDir = path.join(__dirname, '..', 'public', 'demo', 'evidence');

fs.mkdirSync(demoDir, { recursive: true });

// SVG representing Amoxicillin Return Box with Inspection Seals (Demo Simulation)
const returnSvg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="400" fill="#f8fafc"/>
  <rect x="50" y="50" width="500" height="300" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M 50 120 L 550 120" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="70" y="70" width="16" height="16" rx="4" fill="#0d9488"/>
  <text x="95" y="84" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">DEMO PHARMACEUTICAL RETURN EVIDENCE (SIMULATED) #RET-001</text>
  <rect x="70" y="140" width="220" height="180" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4"/>
  <text x="180" y="225" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">AMOXICILLIN 500mg</text>
  <text x="180" y="245" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Batch: AMX-DEMO-001</text>
  <text x="180" y="265" font-family="Arial, sans-serif" font-size="11" fill="#dc2626" text-anchor="middle">EXPIRED: 10/01/2026 (DEMO)</text>
  <text x="320" y="160" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155">Inspection Details (Simulated):</text>
  <text x="320" y="185" font-family="Arial, sans-serif" font-size="12" fill="#475569">• Initiating Pharmacy: Apollo Pharmacy</text>
  <text x="320" y="210" font-family="Arial, sans-serif" font-size="12" fill="#475569">• Units Returned: 100 Strips / Foil Intact</text>
  <text x="320" y="235" font-family="Arial, sans-serif" font-size="12" fill="#475569">• Seal Verification: TAMPER-SEAL #S-88219</text>
  <text x="320" y="260" font-family="Arial, sans-serif" font-size="12" fill="#475569">• Reverse Logistics: MedLine Track #ML-991</text>
  <rect x="320" y="280" width="160" height="28" rx="6" fill="#dcfce7" stroke="#86efac"/>
  <text x="400" y="299" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#166534" text-anchor="middle">SIMULATED SEAL VERIFIED</text>
</svg>`;

// SVG representing High-Temp Destruction Incineration Unit (Demo Simulation)
const incinerationSvg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="400" fill="#042f2e"/>
  <rect x="40" y="40" width="520" height="320" rx="12" fill="#134e4a" stroke="#2dd4bf" stroke-width="2"/>
  <text x="65" y="80" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#5eead4">CIPLA BIO-HAZARDOUS INCINERATION (DEMO RECORD)</text>
  <text x="65" y="105" font-family="Arial, sans-serif" font-size="12" fill="#99f6e4">Facility Unit 4 • Verna Industrial Estate • Simulation Ref #SIM-2026-BIO</text>
  <line x1="40" y1="120" x2="560" y2="120" stroke="#0f766e" stroke-width="2"/>
  
  <rect x="65" y="145" width="220" height="180" rx="8" fill="#042f2e" stroke="#0d9488"/>
  <circle cx="175" cy="225" r="45" fill="#f97316" opacity="0.3"/>
  <circle cx="175" cy="225" r="30" fill="#ef4444" opacity="0.6"/>
  <circle cx="175" cy="225" r="15" fill="#eab308"/>
  <text x="175" y="295" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#fde047" text-anchor="middle">CHAMBER TEMP: 1,150°C</text>

  <text x="310" y="165" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">Destruction Certificate Record (Demo)</text>
  <text x="310" y="190" font-family="Arial, sans-serif" font-size="12" fill="#ccfbf1">• Batch: AMX-DEMO-001 (Simulated)</text>
  <text x="310" y="215" font-family="Arial, sans-serif" font-size="12" fill="#ccfbf1">• Quantity Destroyed: 100 units</text>
  <text x="310" y="240" font-family="Arial, sans-serif" font-size="12" fill="#ccfbf1">• Certificate Ref: DC-DEMO-001</text>
  <text x="310" y="265" font-family="Arial, sans-serif" font-size="12" fill="#ccfbf1">• Method: Pyrolytic Incineration</text>

  <rect x="310" y="285" width="180" height="32" rx="6" fill="#991b1b" stroke="#f87171"/>
  <text x="400" y="306" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">DEMO DESTRUCTION</text>
</svg>`;

fs.writeFileSync(path.join(demoDir, 'amx-return.svg'), returnSvg);
fs.writeFileSync(path.join(demoDir, 'amx-incineration.svg'), incinerationSvg);

// Note: Do NOT write raw SVG strings into .jpg files. 
// True binary JPEG images must be written so browsers and image decoders do not fail.
console.log('Demo evidence SVGs generated.');
