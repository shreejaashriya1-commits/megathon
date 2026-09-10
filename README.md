# MEDTRACE

### Pharmaceutical Reverse Chain Compliance & Re-entry Defense

> **Core Tenet**: Track it. Destroy it. Remember it. Block it if it comes back.  
> **Honest Fraud Guarantee**: MedTrace detects re-entry of a destroyed batch identity with certainty.

---

## 1. Project Overview

**MedTrace** is a closed-loop digital compliance ledger designed for tracking expired, recalled, and compromised pharmaceuticals through the reverse supply chain. 

When expired medicines are returned by pharmacies, they pass through distributors and arrive at authorized manufacturers for bio-hazardous destruction. In traditional supply chains, physical diversion or re-introduction of supposedly destroyed stock into the grey market poses severe public health threats.

MedTrace guarantees that:
1. Once a pharmaceutical batch reaches **`DESTROYED`**, its status is terminal.
2. Its batch number is permanently recorded in the immutable **`batch_registry`**.
3. Any subsequent sale, lookup, or dispensing attempt for that batch identity is blocked at the server level.
4. Immediate alerts with severity ratings are broadcasted in real time to the regulatory command center (**State Drug Controller**).
5. Regulators and compliance auditors can inspect the complete **Batch 360°** lifecycle history with tamper-evident audit logs and photographic evidence.

---

## 2. The Problem & The MedTrace Solution

| The Vulnerability | MedTrace Defense |
|---|---|
| Expired batches returned by pharmacies are diverted from warehouses or destruction sites and re-sold. | Destruction creates an immutable entry in the `batch_registry`. Point-of-sale systems must query this registry before dispensing. |
| Inaccurate physical intake between pharmacy claims and distributor pickups goes unnoticed. | Distributor pickup verification detects quantity discrepancies and locks the batch in a `DISPUTED` state, preventing premature destruction until resolved. |
| Fake destruction certificates or unverified claims of incineration. | Server-side validation requires a verified destruction facility record before a certificate can be generated, automatically signing and locking the record. |
| Delayed reporting of counterfeit or expired medicine circulation. | Automated severity calculation (`WARNING` for expired stock, `HIGH` for first destroyed sale attempt, `CRITICAL` for repeat breaches) with instant regulator notifications. |

---

## 3. Architecture & Tech Stack

```
[Retailer / Pharmacy]  ──>  [Distributor Logistics]  ──>  [Manufacturer Incinerator]
  • Initiate Return          • Physical Intake Audit       • Log Bio-Destruction
  • Dispense Simulator       • Dispute Resolution          • Issue Certificate
         │                            │                             │
         └────────────────────────────┼─────────────────────────────┘
                                      ▼
                      [MedTrace State Machine API]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
  [Permanent batch_registry]                           [Tamper-Evident Audit Logs]
            │                                                   │
            └─────────────────────────┬─────────────────────────┘
                                      ▼
                   [Regulator Realtime Surveillance Feed]
```

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS with enterprise pharmaceutical compliance design palette (Dark Teal, Medical Slate, Warning Amber, Critical Red)
- **Hardware QR Scanner**: `html5-qrcode` with mobile/web camera support and fallback token resolver
- **Backend**: Next.js App Router Route Handlers (`/api/*`)
- **Database**: Supabase PostgreSQL with schema migrations, indexes, triggers, and dual-driver resilient local fallback (`.medtrace-db.json`)
- **Surveillance Stream**: Supabase Realtime with 3-second automatic polling fallback

---

## 4. Database Schema

- **`orgs`**: `id`, `name`, `role` (`retailer`, `distributor`, `manufacturer`, `regulator`), `location`
- **`medicines`**: `id`, `name`, `generic_name`, `manufacturer_org_id`, `category`, `dosage_form`
- **`batches`**: `batch_number` (PK), `medicine_id`, `quantity`, `mfg_date`, `expiry_date`, `current_holder_org_id`, `status` (`ACTIVE`, `RETURN_INITIATED`, `RETURN_CONFIRMED`, `DISPUTED`, `DESTROYED`), `qr_token`, `created_at`
- **`return_requests`**: `id`, `batch_number`, `retailer_org_id`, `qty_claimed`, `condition`, `photo_url`, `status` (`pending`, `confirmed`, `disputed`)
- **`pickups`**: `id`, `return_request_id`, `distributor_org_id`, `qty_received`, `disputed`, `confirmed_at`
- **`destructions`**: `id`, `batch_number`, `manufacturer_org_id`, `facility_name`, `qty_destroyed`, `evidence_url`, `destroyed_at`
- **`destruction_certificates`**: `id`, `batch_number`, `destruction_id`, `certificate_no` (Unique), `issued_at`
- **`batch_registry`**: `batch_number` (PK), `terminal_status` (`DESTROYED`), `destroyed_at` *(Permanently immutable; records are never deleted)*
- **`scans`**: `id`, `batch_number`, `org_id`, `action` (`lookup`, `sale_attempt`), `result` (`allowed`, `blocked`)
- **`alerts`**: `id`, `batch_number`, `attempted_by_org_id`, `severity` (`WARNING`, `HIGH`, `CRITICAL`), `reason`, `status` (`open`, `investigating`, `resolved`)
- **`audit_logs`**: `id`, `actor_org_id`, `action`, `entity`, `old_state`, `new_state`, `created_at`

---

## 5. Pre-Seeded Demonstration Data

### Seed Organizations
1. **Apollo Pharmacy** (`role: retailer`)
2. **MedLine Distributors** (`role: distributor`)
3. **Cipla Ltd** (`role: manufacturer`)
4. **State Drug Controller** (`role: regulator`)

### Seed Batches
- **`AMX-DEMO-001` (Amoxicillin 500mg)**: Pre-destroyed batch with Certificate `DC-DEMO-001`. Stored in `batch_registry` for **instant fraud detection demonstration**.
- **`PCM2026A01` (Paracetamol 650mg)**: Expired active batch (`status: ACTIVE`) ready for the live 7-step reverse compliance journey.
- **`AZI-2026-088` (Azithromycin 500mg)**: Valid active unexpired batch for verifying authorized dispensing.
- **`MET-2026-045` (Metformin 500mg)**: Expiring Soon (~45 days).
- **`ATO-2026-012` (Atorvastatin 20mg)**: Urgent expiry notice (~15 days).
- **`PCM-EXP-999` (Paracetamol 650mg)**: Expired active batch for demonstrating point-of-sale expiry warning blocks.

---

## 6. How to Run Locally

### Prerequisites
- Node.js 18+ or 22+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration (Optional for Supabase)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials if using a remote Supabase project:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
> *Note: If Supabase credentials are not provided, MedTrace seamlessly uses an automated, persistent local database fallback (`.medtrace-db.json`) initialized from `seed.sql`, ensuring single-source-of-truth zero-friction execution.*

### 3. Build & Run
```bash
# Development mode
npm run dev

# Or production build & start
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. How to Test

MedTrace includes a test verification script that tests all 16 specification requirements:

```bash
npm run test:verify
```

Reset database to initial pristine seed at any time:
```bash
npm run db:reset
```

---

## 8. Live Judge Demo Script

### Step 1: Apollo Pharmacy (Retailer)
1. In the top bar, set "Acting as" to **Apollo Pharmacy (Retailer)**.
2. Navigate to **Retailer Inventory**.
3. Locate batch **`PCM2026A01`** (Paracetamol 650mg), tagged as **EXPIRED**.
4. Click **Initiate Return**. Use the camera QR scanner or click the demo trigger `PCM2026A01-TOKEN`.
5. Enter quantity claimed (`250`), inspect packaging notes, and submit. Status transitions to **`RETURN_INITIATED`**.

### Step 2: MedLine Distributors (Distributor)
1. Switch role to **MedLine Distributors (Distributor)**.
2. In the intake queue, find return **#RET-2** for `PCM2026A01`.
3. Click **Confirm Pickup**.
   - *(Optional Dispute Test)*: Enter `200` received vs `250` claimed $\rightarrow$ transitions batch to **`DISPUTED`**. Click **Resolve Dispute**, enter `250` to reconcile count.
   - Enter `250` $\rightarrow$ batch transitions to **`RETURN_CONFIRMED`**.

### Step 3: Cipla Ltd (Manufacturer)
1. Switch role to **Cipla Ltd (Manufacturer)**.
2. In the destruction queue, locate `PCM2026A01`.
3. Click **Schedule + Confirm Destruction**.
4. Confirm facility: *Cipla Hazardous Bio-Destruction Facility Unit 4, Verna*. Quantity: `250`. Submit.
5. Click **Issue Certificate & Lock Registry**.
6. Certificate `MTC-2026-00002` is generated. The batch status becomes **`DESTROYED`** and is permanently recorded in **`batch_registry`**.

### Step 4: Batch 360° Timeline Audit
1. Click **Inspect 360°** for `PCM2026A01`.
2. View the complete vertical audit timeline: Batch Creation $\rightarrow$ Pharmacy Return $\rightarrow$ Distributor Intake $\rightarrow$ Destruction Execution $\rightarrow$ Certificate Issuance.
3. Switch to the **Evidence** tab to inspect photos, facility stamps, and certificate details.

### Step 5: Attempt Re-Entry at Point of Sale
1. Switch back to **Apollo Pharmacy**.
2. Open **Sell / Dispense Simulator**.
3. Scan or enter batch **`PCM2026A01`**.
4. **RESULT: SALE BLOCKED**. The screen flashes the prominent red defense banner:
   > **DESTROYED BATCH DETECTED**  
   > *BLOCKED - this batch was destroyed on [date]. Ref: MTC-2026-00002.*

### Step 6: State Drug Controller (Regulator)
1. Switch role to **State Drug Controller (Regulator)**.
2. Open **Regulator Command Feed**.
3. Observe the live alert in the surveillance feed with severity level, retailer identity, timestamp, and instant link to the full Batch 360° audit trace.

### Step 7: Instant Fraud Demonstration with Pre-Destroyed Batch
1. Open **Sell / Dispense Simulator**.
2. Scan pre-destroyed batch **`AMX-DEMO-001`**.
3. MedTrace instantly blocks the attempt with **HIGH** or **CRITICAL** severity based on prior attempts, demonstrating fraud defense without any manual setup.

---

## 9. Honest Fraud Model & MVP Scope

### What MedTrace Guarantees
- Detects and blocks re-entry of any known destroyed batch identity scanned or entered for sale.
- Prevents dispensing of expired active batches with warning alerts.
- Maintains an immutable terminal destruction ledger that cannot be reversed or altered.
- Provides complete reverse chain traceability across all stakeholders.

### What Is Out of Scope for this MVP
- Physical package computer vision / tamper seal image recognition.
- Optical Character Recognition (OCR) for label text extraction.
- Statistical anomaly detection on distributor shipment times.
- Direct CDSCO / SUGAM central government portal integration.
- Hardware RFID / cryptographic NFC tag verification.

---

## 10. License & Compliance
Built for the Hackathon compliance demonstration adhering to CDSCO and Central Pollution Control Board (CPCB) pharmaceutical waste destruction guidelines.
