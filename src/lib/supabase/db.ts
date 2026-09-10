import fs from 'fs';
import path from 'path';
import { supabaseServer, isSupabaseServerConfigured } from './server';
import {
  Org,
  Medicine,
  Batch,
  ReturnRequest,
  Pickup,
  Destruction,
  DestructionCertificate,
  BatchRegistry,
  Scan,
  Alert,
  AuditLog,
  BatchStatus,
  AlertStatus,
} from '@/../types/database';
import { Batch360Data, SaleAttemptResult, TimelineEvent } from '@/../types/medtrace';
import { calculateDestroyedBatchSeverity } from '../fraud';
import { isBatchExpired } from '../expiry';
import { canTransition } from '../lifecycle';

// File path for local persistent backup store
const DB_FILE = path.join(process.cwd(), '.medtrace-db.json');

interface LocalDatabase {
  orgs: Org[];
  medicines: Medicine[];
  batches: Batch[];
  return_requests: ReturnRequest[];
  pickups: Pickup[];
  destructions: Destruction[];
  destruction_certificates: DestructionCertificate[];
  batch_registry: BatchRegistry[];
  scans: Scan[];
  alerts: Alert[];
  audit_logs: AuditLog[];
}

// Initial seed data aligned exactly with seed.sql
function getInitialSeedData(): LocalDatabase {
  return {
    orgs: [
      { id: 1, name: 'Apollo Pharmacy - Ajmer', role: 'retailer', location: 'Kaiser Ganj, Ajmer, Rajasthan' },
      { id: 2, name: 'City Medicos', role: 'retailer', location: 'Shop 14, Main Market, Malviya Nagar, Jaipur, Rajasthan' },
      { id: 3, name: 'Sunrise Pharmacy', role: 'retailer', location: 'G-22 Commercial Complex, Sector 18, Noida, Uttar Pradesh' },
      { id: 4, name: 'MedLine Distributors', role: 'distributor', location: 'Bhiwandi Central Logistics Hub, Maharashtra' },
      { id: 5, name: 'Cipla Ltd', role: 'manufacturer', location: 'Verna Industrial Estate, Salcete, Goa' },
      { id: 6, name: 'State Drug Controller', role: 'regulator', location: 'FDA Bhavan, Kotla Road, New Delhi' },
    ],
    medicines: [
      { id: 1, name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', manufacturer_org_id: 5, category: 'Antibiotic', dosage_form: 'Capsule' },
      { id: 2, name: 'Paracetamol 650mg', generic_name: 'Acetaminophen', manufacturer_org_id: 5, category: 'Analgesic / Antipyretic', dosage_form: 'Tablet' },
      { id: 3, name: 'Azithromycin 500mg', generic_name: 'Azithromycin Dihydrate', manufacturer_org_id: 5, category: 'Antibiotic', dosage_form: 'Tablet' },
      { id: 4, name: 'Metformin 500mg', generic_name: 'Metformin Hydrochloride', manufacturer_org_id: 5, category: 'Antidiabetic', dosage_form: 'Extended-Release Tablet' },
      { id: 5, name: 'Atorvastatin 20mg', generic_name: 'Atorvastatin Calcium', manufacturer_org_id: 5, category: 'Cardiovascular / Statin', dosage_form: 'Film-Coated Tablet' },
    ],
    batches: [
      {
        batch_number: 'AMX-DEMO-001',
        medicine_id: 1,
        quantity: 100,
        mfg_date: '2025-01-10',
        expiry_date: '2026-01-10',
        current_holder_org_id: 5,
        status: 'DESTROYED',
        qr_token: 'AMX-DEMO-001-TOKEN',
        created_at: '2025-01-10T10:00:00Z',
      },
      {
        batch_number: 'PCM2026A01',
        medicine_id: 2,
        quantity: 100,
        mfg_date: '2025-08-01',
        expiry_date: '2026-08-25',
        current_holder_org_id: 1,
        status: 'ACTIVE',
        qr_token: 'PCM2026A01-TOKEN',
        created_at: '2025-08-01T09:30:00Z',
      },
      {
        batch_number: 'AZI-2026-088',
        medicine_id: 3,
        quantity: 120,
        mfg_date: '2026-02-15',
        expiry_date: '2027-02-15',
        current_holder_org_id: 1,
        status: 'ACTIVE',
        qr_token: 'AZI-2026-088-TOKEN',
        created_at: '2026-02-15T11:00:00Z',
      },
      {
        batch_number: 'MET-2026-045',
        medicine_id: 4,
        quantity: 300,
        mfg_date: '2025-10-25',
        expiry_date: '2026-10-25',
        current_holder_org_id: 1,
        status: 'ACTIVE',
        qr_token: 'MET-2026-045-TOKEN',
        created_at: '2025-10-25T14:15:00Z',
      },
      {
        batch_number: 'ATO-2026-012',
        medicine_id: 5,
        quantity: 180,
        mfg_date: '2025-09-25',
        expiry_date: '2026-09-25',
        current_holder_org_id: 1,
        status: 'ACTIVE',
        qr_token: 'ATO-2026-012-TOKEN',
        created_at: '2025-09-25T08:45:00Z',
      },
      {
        batch_number: 'PCM-EXP-999',
        medicine_id: 2,
        quantity: 80,
        mfg_date: '2025-08-10',
        expiry_date: '2026-08-10',
        current_holder_org_id: 1,
        status: 'ACTIVE',
        qr_token: 'PCM-EXP-999-TOKEN',
        created_at: '2025-08-10T16:20:00Z',
      },
      {
        batch_number: 'CM-AMX-2026',
        medicine_id: 1,
        quantity: 90,
        mfg_date: '2026-01-15',
        expiry_date: '2027-01-15',
        current_holder_org_id: 2,
        status: 'ACTIVE',
        qr_token: 'CM-AMX-2026-TOKEN',
        created_at: '2026-01-15T09:00:00Z',
      },
      {
        batch_number: 'SUN-AZI-2026',
        medicine_id: 3,
        quantity: 60,
        mfg_date: '2026-02-10',
        expiry_date: '2027-02-10',
        current_holder_org_id: 3,
        status: 'ACTIVE',
        qr_token: 'SUN-AZI-2026-TOKEN',
        created_at: '2026-02-10T10:30:00Z',
      },
    ],
    return_requests: [
      {
        id: 1,
        batch_number: 'AMX-DEMO-001',
        retailer_org_id: 1,
        qty_claimed: 100,
        condition: 'Expired packaging intact',
        photo_url: '/demo/evidence/amx-return.jpg',
        status: 'confirmed',
        created_at: '2026-02-01T10:00:00Z',
      },
    ],
    pickups: [
      {
        id: 1,
        return_request_id: 1,
        distributor_org_id: 4,
        qty_received: 100,
        disputed: false,
        confirmed_at: '2026-02-05T14:30:00Z',
      },
    ],
    destructions: [
      {
        id: 1,
        batch_number: 'AMX-DEMO-001',
        manufacturer_org_id: 5,
        facility_name: 'Cipla Hazardous Bio-Destruction Facility, Verna',
        qty_destroyed: 100,
        evidence_url: '/demo/evidence/amx-incineration.jpg',
        destroyed_at: '2026-02-12T11:15:00Z',
      },
    ],
    destruction_certificates: [
      {
        id: 1,
        batch_number: 'AMX-DEMO-001',
        destruction_id: 1,
        certificate_no: 'DC-DEMO-001',
        issued_at: '2026-02-12T11:20:00Z',
      },
    ],
    batch_registry: [
      {
        batch_number: 'AMX-DEMO-001',
        terminal_status: 'DESTROYED',
        destroyed_at: '2026-02-12T11:20:00Z',
      },
    ],
    scans: [],
    alerts: [],
    audit_logs: [
      { id: 1, actor_org_id: 5, action: 'BATCH_CREATED', entity: 'AMX-DEMO-001', old_state: null, new_state: 'ACTIVE', created_at: '2025-01-10T10:00:00Z' },
      { id: 2, actor_org_id: 1, action: 'RETURN_INITIATED', entity: 'AMX-DEMO-001', old_state: 'ACTIVE', new_state: 'RETURN_INITIATED', created_at: '2026-02-01T10:00:00Z' },
      { id: 3, actor_org_id: 4, action: 'PICKUP_CONFIRMED', entity: 'AMX-DEMO-001', old_state: 'RETURN_INITIATED', new_state: 'RETURN_CONFIRMED', created_at: '2026-02-05T14:30:00Z' },
      { id: 4, actor_org_id: 5, action: 'DESTRUCTION_LOGGED', entity: 'AMX-DEMO-001', old_state: 'RETURN_CONFIRMED', new_state: 'RETURN_CONFIRMED', created_at: '2026-02-12T11:15:00Z' },
      { id: 5, actor_org_id: 5, action: 'CERTIFICATE_ISSUED', entity: 'AMX-DEMO-001', old_state: 'RETURN_CONFIRMED', new_state: 'DESTROYED', created_at: '2026-02-12T11:20:00Z' },
      { id: 6, actor_org_id: 5, action: 'BATCH_DESTROYED', entity: 'AMX-DEMO-001', old_state: 'RETURN_CONFIRMED', new_state: 'DESTROYED', created_at: '2026-02-12T11:20:00Z' },
    ],
  };
}

function loadLocalDb(): LocalDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading local DB, initializing from seed:', err);
  }
  const initial = getInitialSeedData();
  saveLocalDb(initial);
  return initial;
}

function saveLocalDb(data: LocalDatabase): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local DB:', err);
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

export async function getOrgs(): Promise<Org[]> {
  if (isSupabaseServerConfigured && supabaseServer) {
    const { data, error } = await supabaseServer.from('orgs').select('*').order('id');
    if (!error && data) return data;
  }
  const db = loadLocalDb();
  return db.orgs;
}

export async function getOrgById(id: number): Promise<Org | null> {
  if (isSupabaseServerConfigured && supabaseServer) {
    const { data, error } = await supabaseServer.from('orgs').select('*').eq('id', id).single();
    if (!error && data) return data;
  }
  const db = loadLocalDb();
  return db.orgs.find((o) => o.id === id) || null;
}

export async function getBatches(orgId?: number): Promise<Batch[]> {
  const db = loadLocalDb();
  let batches = db.batches.map((b) => ({
    ...b,
    medicine: db.medicines.find((m) => m.id === b.medicine_id),
    current_holder: db.orgs.find((o) => o.id === b.current_holder_org_id),
  }));

  if (orgId) {
    const org = db.orgs.find((o) => o.id === orgId);
    if (org && org.role !== 'regulator') {
      batches = batches.filter((b) => b.current_holder_org_id === orgId);
    }
  }

  return batches;
}

export async function getBatchByNumber(batchNumber: string): Promise<Batch | null> {
  const db = loadLocalDb();
  const b = db.batches.find((item) => item.batch_number === batchNumber);
  if (!b) return null;
  return {
    ...b,
    medicine: db.medicines.find((m) => m.id === b.medicine_id),
    current_holder: db.orgs.find((o) => o.id === b.current_holder_org_id),
  };
}

export async function getBatchByQrToken(qrToken: string): Promise<Batch | null> {
  const db = loadLocalDb();
  const b = db.batches.find((item) => item.qr_token === qrToken);
  if (!b) return null;
  return {
    ...b,
    medicine: db.medicines.find((m) => m.id === b.medicine_id),
    current_holder: db.orgs.find((o) => o.id === b.current_holder_org_id),
  };
}

export async function createBatch(params: {
  batch_number?: string;
  medicine_id?: number;
  product_name?: string;
  quantity: number;
  expiry_date: string;
  mfg_date?: string;
  manufacturer_org_id: number;
  holder_org_id?: number;
}): Promise<{ success: boolean; data?: Batch; error?: string }> {
  const db = loadLocalDb();

  // Validate manufacturer
  const manufacturer = db.orgs.find((o) => o.id === params.manufacturer_org_id);
  if (!manufacturer || manufacturer.role !== 'manufacturer') {
    return { success: false, error: 'Only authorized manufacturers can create medicine batches' };
  }

  // Determine medicine
  let medicineId = params.medicine_id;
  if (!medicineId && params.product_name) {
    let med = db.medicines.find(
      (m) => m.name.toLowerCase() === params.product_name!.trim().toLowerCase()
    );
    if (!med) {
      const newMedId = db.medicines.length + 1;
      med = {
        id: newMedId,
        name: params.product_name.trim(),
        generic_name: params.product_name.trim(),
        manufacturer_org_id: params.manufacturer_org_id,
        category: 'Pharmaceutical',
        dosage_form: 'Standard Unit',
      };
      db.medicines.push(med);
    }
    medicineId = med.id;
  }

  if (!medicineId) {
    medicineId = 1;
  }

  // Generate or sanitize batch number
  let batchNum = params.batch_number?.trim().toUpperCase();
  if (!batchNum) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    batchNum = `BATCH-2026-${randomSuffix}`;
  }

  // Check uniqueness
  const existing = db.batches.find((b) => b.batch_number.toUpperCase() === batchNum);
  if (existing) {
    return { success: false, error: `Batch number ${batchNum} already exists in registry` };
  }

  if (!params.quantity || params.quantity <= 0) {
    return { success: false, error: 'Quantity must be greater than zero' };
  }

  if (!params.expiry_date) {
    return { success: false, error: 'Expiry date is required' };
  }

  const qrToken = `${batchNum}-TOKEN`;
  const mfgDate = params.mfg_date || new Date().toISOString().split('T')[0];
  const holderOrgId = params.holder_org_id || 1;

  const newBatch: Batch = {
    batch_number: batchNum,
    medicine_id: medicineId,
    mfg_date: mfgDate,
    expiry_date: params.expiry_date,
    quantity: params.quantity,
    status: 'ACTIVE',
    current_holder_org_id: holderOrgId,
    qr_token: qrToken,
  };

  db.batches.push(newBatch);

  // Add audit log for batch creation
  db.audit_logs.push({
    id: db.audit_logs.length + 1,
    actor_org_id: params.manufacturer_org_id,
    action: 'BATCH_CREATED',
    entity: batchNum,
    old_state: null,
    new_state: 'ACTIVE',
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);

  return {
    success: true,
    data: {
      ...newBatch,
      medicine: db.medicines.find((m) => m.id === medicineId),
      current_holder: db.orgs.find((o) => o.id === holderOrgId),
    },
  };
}

export async function createReturnRequest(params: {
  batch_number: string;
  retailer_org_id: number;
  qty_claimed: number;
  condition: string | null;
  photo_url: string | null;
}): Promise<{ success: boolean; data?: ReturnRequest; error?: string }> {
  const db = loadLocalDb();
  const batch = db.batches.find((b) => b.batch_number === params.batch_number);

  if (!batch) {
    return { success: false, error: `Batch '${params.batch_number}' not found` };
  }

  if (params.qty_claimed <= 0) {
    return { success: false, error: 'Claimed quantity must be greater than zero' };
  }

  const retailerOrg = db.orgs.find((o) => o.id === params.retailer_org_id);
  if (!retailerOrg || retailerOrg.role !== 'retailer') {
    return { success: false, error: 'Only authorized retail pharmacies can initiate returns' };
  }

  // State machine check - terminal batches cannot be returned by any holder
  const transitionCheck = canTransition(batch.status, 'RETURN_INITIATED');
  if (!transitionCheck.allowed) {
    return { success: false, error: transitionCheck.reason };
  }

  if (batch.current_holder_org_id && batch.current_holder_org_id !== params.retailer_org_id) {
    return {
      success: false,
      error: `Batch '${params.batch_number}' is not currently held by this retailer.`,
    };
  }

  if (params.qty_claimed > batch.quantity) {
    return {
      success: false,
      error: `Claimed quantity (${params.qty_claimed}) exceeds batch quantity (${batch.quantity})`,
    };
  }

  // Update batch
  const oldState = batch.status;
  batch.status = 'RETURN_INITIATED';

  // Create return request
  const newReturnId = db.return_requests.length > 0 ? Math.max(...db.return_requests.map((r) => r.id)) + 1 : 1;
  const newReturn: ReturnRequest = {
    id: newReturnId,
    batch_number: params.batch_number,
    retailer_org_id: params.retailer_org_id,
    qty_claimed: params.qty_claimed,
    condition: params.condition,
    photo_url: params.photo_url,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  db.return_requests.push(newReturn);

  // Audit log
  const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId,
    actor_org_id: params.retailer_org_id,
    action: 'RETURN_INITIATED',
    entity: params.batch_number,
    old_state: oldState,
    new_state: 'RETURN_INITIATED',
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);
  return { success: true, data: newReturn };
}

export async function getReturnRequests(orgId?: number): Promise<ReturnRequest[]> {
  const db = loadLocalDb();
  const filtered = orgId ? db.return_requests.filter((r) => r.retailer_org_id === orgId) : db.return_requests;
  return filtered
    .map((r) => {
      const batch = db.batches.find((b) => b.batch_number === r.batch_number);
      const pickup = db.pickups.find((p) => p.return_request_id === r.id);
      return {
        ...r,
        batch: batch
          ? {
              ...batch,
              medicine: db.medicines.find((m) => m.id === batch.medicine_id),
            }
          : undefined,
        retailer: db.orgs.find((o) => o.id === r.retailer_org_id),
        pickup: pickup
          ? {
              ...pickup,
              distributor: db.orgs.find((o) => o.id === pickup.distributor_org_id),
            }
          : undefined,
      };
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
}

export async function confirmPickup(params: {
  return_request_id: number;
  distributor_org_id: number;
  qty_received: number;
}): Promise<{ success: boolean; data?: Pickup; batchStatus: BatchStatus; disputed: boolean; error?: string }> {
  const db = loadLocalDb();
  const returnReq = db.return_requests.find((r) => r.id === params.return_request_id);

  if (!returnReq) {
    return { success: false, error: 'Return request not found', batchStatus: 'RETURN_INITIATED', disputed: false };
  }

  const batch = db.batches.find((b) => b.batch_number === returnReq.batch_number);
  if (!batch) {
    return { success: false, error: 'Batch not found', batchStatus: 'RETURN_INITIATED', disputed: false };
  }

  const distributorOrg = db.orgs.find((o) => o.id === params.distributor_org_id);
  if (!distributorOrg || distributorOrg.role !== 'distributor') {
    return {
      success: false,
      error: 'Only authorized distributors can confirm pickups',
      batchStatus: batch.status,
      disputed: false,
    };
  }

  if (batch.status !== 'RETURN_INITIATED') {
    return {
      success: false,
      error: `Cannot pickup batch in status '${batch.status}'. Expected 'RETURN_INITIATED'`,
      batchStatus: batch.status,
      disputed: false,
    };
  }

  const isDisputed = params.qty_received !== returnReq.qty_claimed;
  const nextStatus: BatchStatus = isDisputed ? 'DISPUTED' : 'RETURN_CONFIRMED';

  // Update batch
  const oldState = batch.status;
  batch.status = nextStatus;
  if (!isDisputed) {
    batch.current_holder_org_id = params.distributor_org_id;
  }

  // Update return request
  returnReq.status = isDisputed ? 'disputed' : 'confirmed';

  // Create pickup record
  const pickupId = db.pickups.length > 0 ? Math.max(...db.pickups.map((p) => p.id)) + 1 : 1;
  const newPickup: Pickup = {
    id: pickupId,
    return_request_id: params.return_request_id,
    distributor_org_id: params.distributor_org_id,
    qty_received: params.qty_received,
    disputed: isDisputed,
    confirmed_at: new Date().toISOString(),
  };
  db.pickups.push(newPickup);

  // Audit log
  const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId,
    actor_org_id: params.distributor_org_id,
    action: isDisputed ? 'PICKUP_DISPUTED' : 'PICKUP_CONFIRMED',
    entity: batch.batch_number,
    old_state: oldState,
    new_state: nextStatus,
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);
  return { success: true, data: newPickup, batchStatus: nextStatus, disputed: isDisputed };
}

export async function resolveDispute(params: {
  return_request_id: number;
  distributor_org_id: number;
  corrected_qty: number;
}): Promise<{ success: boolean; error?: string }> {
  const db = loadLocalDb();

  const distOrg = db.orgs.find((o) => o.id === params.distributor_org_id);
  if (!distOrg || distOrg.role !== 'distributor') {
    return { success: false, error: 'Only authorized distributors can resolve custody disputes' };
  }

  const returnReq = db.return_requests.find((r) => r.id === params.return_request_id);

  if (!returnReq) {
    return { success: false, error: 'Return request not found' };
  }

  const batch = db.batches.find((b) => b.batch_number === returnReq.batch_number);
  if (!batch) {
    return { success: false, error: 'Batch not found' };
  }

  if (batch.status !== 'DISPUTED') {
    return { success: false, error: `Batch status is '${batch.status}', not 'DISPUTED'` };
  }

  // Update return request & batch
  returnReq.qty_claimed = params.corrected_qty;
  returnReq.status = 'confirmed';
  
  // Update pickup if exists
  const pickup = db.pickups.find((p) => p.return_request_id === returnReq.id);
  if (pickup) {
    pickup.qty_received = params.corrected_qty;
    pickup.disputed = false;
  }

  const oldState = batch.status;
  batch.status = 'RETURN_CONFIRMED';
  batch.current_holder_org_id = params.distributor_org_id;

  // Audit log
  const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId,
    actor_org_id: params.distributor_org_id,
    action: 'DISPUTE_RESOLVED',
    entity: batch.batch_number,
    old_state: oldState,
    new_state: 'RETURN_CONFIRMED',
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);
  return { success: true };
}

export async function getConfirmedPickups(): Promise<any[]> {
  const db = loadLocalDb();
  // Return confirmed batches that are ready for destruction
  const confirmedBatches = db.batches.filter((b) => b.status === 'RETURN_CONFIRMED');

  return confirmedBatches.map((b) => {
    const returnReq = db.return_requests.find((r) => r.batch_number === b.batch_number);
    const pickup = returnReq ? db.pickups.find((p) => p.return_request_id === returnReq.id) : null;
    const destruction = db.destructions.find((d) => d.batch_number === b.batch_number);
    return {
      batch: {
        ...b,
        medicine: db.medicines.find((m) => m.id === b.medicine_id),
      },
      return_request: returnReq,
      pickup: pickup
        ? {
            ...pickup,
            distributor: db.orgs.find((o) => o.id === pickup.distributor_org_id),
          }
        : null,
      destruction,
    };
  });
}

export async function logDestruction(params: {
  batch_number: string;
  manufacturer_org_id: number;
  facility_name: string;
  qty_destroyed: number;
  evidence_url?: string | null;
}): Promise<{ success: boolean; data?: Destruction; error?: string }> {
  const db = loadLocalDb();
  const batch = db.batches.find((b) => b.batch_number === params.batch_number);

  if (!batch) {
    return { success: false, error: 'Batch not found' };
  }

  const mfgOrg = db.orgs.find((o) => o.id === params.manufacturer_org_id);
  if (!mfgOrg || mfgOrg.role !== 'manufacturer') {
    return { success: false, error: 'Only authorized manufacturers can execute destruction logging' };
  }

  if (batch.status !== 'RETURN_CONFIRMED') {
    return {
      success: false,
      error: `Cannot log destruction for batch in status '${batch.status}'. Only 'RETURN_CONFIRMED' batches can be destroyed.`,
    };
  }

  // Prevent duplicate destruction record
  const existingDestruction = db.destructions.find((d) => d.batch_number === params.batch_number);
  if (existingDestruction) {
    return { success: false, error: 'Destruction already logged for this batch' };
  }

  const destructionId = db.destructions.length > 0 ? Math.max(...db.destructions.map((d) => d.id)) + 1 : 1;
  const newDestruction: Destruction = {
    id: destructionId,
    batch_number: params.batch_number,
    manufacturer_org_id: params.manufacturer_org_id,
    facility_name: params.facility_name,
    qty_destroyed: params.qty_destroyed,
    evidence_url: params.evidence_url || null,
    destroyed_at: new Date().toISOString(),
  };
  db.destructions.push(newDestruction);

  // Audit log
  const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId,
    actor_org_id: params.manufacturer_org_id,
    action: 'DESTRUCTION_LOGGED',
    entity: params.batch_number,
    old_state: 'RETURN_CONFIRMED',
    new_state: 'RETURN_CONFIRMED',
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);
  return { success: true, data: newDestruction };
}

export async function issueCertificate(params: {
  batch_number: string;
  destruction_id: number;
  actor_org_id?: number;
}): Promise<{ success: boolean; data?: DestructionCertificate; error?: string }> {
  const db = loadLocalDb();
  const batch = db.batches.find((b) => b.batch_number === params.batch_number);

  if (!batch) {
    return { success: false, error: 'Batch not found' };
  }

  if (params.actor_org_id) {
    const actorOrg = db.orgs.find((o) => o.id === params.actor_org_id);
    if (!actorOrg || actorOrg.role !== 'manufacturer') {
      return { success: false, error: 'Only authorized manufacturers can issue destruction certificates' };
    }
  }

  if (batch.status === 'DESTROYED') {
    return {
      success: false,
      error: `Batch '${batch.batch_number}' is already DESTROYED. Destruction certificates cannot be re-issued.`,
    };
  }

  // Server security rule: only allowed when batch.status == RETURN_CONFIRMED
  if (batch.status !== 'RETURN_CONFIRMED') {
    return {
      success: false,
      error: `Certificate can only be issued for batches in 'RETURN_CONFIRMED' status. Current status: '${batch.status}'`,
    };
  }

  // Destruction record must exist
  const destruction = db.destructions.find((d) => d.id === params.destruction_id);
  if (!destruction) {
    return { success: false, error: `Destruction record #${params.destruction_id} does not exist` };
  }

  const actorOrgId = params.actor_org_id || destruction.manufacturer_org_id;
  const actorOrg = db.orgs.find((o) => o.id === actorOrgId);
  if (!actorOrg || actorOrg.role !== 'manufacturer') {
    return { success: false, error: 'Only authorized manufacturers can issue destruction certificates' };
  }

  // Destruction batch number must match
  if (destruction.batch_number !== params.batch_number) {
    return {
      success: false,
      error: `Destruction record batch '${destruction.batch_number}' does not match requested batch '${params.batch_number}'`,
    };
  }

  // Cannot be in registry
  const inRegistry = db.batch_registry.some((r) => r.batch_number === params.batch_number);
  if (inRegistry) {
    return { success: false, error: 'Batch is already permanently destroyed' };
  }

  // Generate realistic certificate number e.g. MTC-2026-00002
  const certCount = db.destruction_certificates.length + 1;
  const certNo = `MTC-2026-${String(certCount).padStart(5, '0')}`;

  const certId = db.destruction_certificates.length > 0 ? Math.max(...db.destruction_certificates.map((c) => c.id)) + 1 : 1;
  const newCert: DestructionCertificate = {
    id: certId,
    batch_number: params.batch_number,
    destruction_id: params.destruction_id,
    certificate_no: certNo,
    issued_at: new Date().toISOString(),
  };
  db.destruction_certificates.push(newCert);

  // Transition batch to DESTROYED
  const oldState = batch.status;
  batch.status = 'DESTROYED';
  batch.current_holder_org_id = destruction.manufacturer_org_id;

  // Insert into permanent batch_registry (NEVER DELETE)
  db.batch_registry.push({
    batch_number: params.batch_number,
    terminal_status: 'DESTROYED',
    destroyed_at: newCert.issued_at,
  });

  // Audit logs
  const auditId1 = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId1,
    actor_org_id: params.actor_org_id || destruction.manufacturer_org_id,
    action: 'CERTIFICATE_ISSUED',
    entity: params.batch_number,
    old_state: oldState,
    new_state: 'DESTROYED',
    created_at: new Date().toISOString(),
  });

  const auditId2 = auditId1 + 1;
  db.audit_logs.push({
    id: auditId2,
    actor_org_id: params.actor_org_id || destruction.manufacturer_org_id,
    action: 'BATCH_DESTROYED',
    entity: params.batch_number,
    old_state: oldState,
    new_state: 'DESTROYED',
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);
  return { success: true, data: newCert };
}

export async function getCertificates(): Promise<DestructionCertificate[]> {
  const db = loadLocalDb();
  return db.destruction_certificates
    .map((cert) => {
      const destruction = db.destructions.find((d) => d.id === cert.destruction_id);
      const batch = db.batches.find((b) => b.batch_number === cert.batch_number);
      return {
        ...cert,
        destruction: destruction
          ? {
              ...destruction,
              manufacturer: db.orgs.find((o) => o.id === destruction.manufacturer_org_id),
            }
          : undefined,
        batch: batch
          ? {
              ...batch,
              medicine: db.medicines.find((m) => m.id === batch.medicine_id),
            }
          : undefined,
      };
    })
    .sort((a, b) => new Date(b.issued_at || '').getTime() - new Date(a.issued_at || '').getTime());
}

export async function attemptSale(params: {
  batch_number: string;
  retailer_org_id: number;
}): Promise<SaleAttemptResult> {
  const db = loadLocalDb();
  const { batch_number, retailer_org_id } = params;
  const now = new Date().toISOString();

  // STEP 1: Check batch_registry (PERMANENT DESTROYED RECORD)
  const registryRecord = db.batch_registry.find((r) => r.batch_number === batch_number);
  if (registryRecord) {
    // Count previous blocked scans for this batch
    const previousBlockedCount = db.scans.filter(
      (s) => s.batch_number === batch_number && s.result === 'blocked'
    ).length;

    const severity = calculateDestroyedBatchSeverity(previousBlockedCount);

    // Create blocked scan
    const scanId = db.scans.length > 0 ? Math.max(...db.scans.map((s) => s.id)) + 1 : 1;
    db.scans.push({
      id: scanId,
      batch_number,
      org_id: retailer_org_id,
      action: 'sale_attempt',
      result: 'blocked',
      created_at: now,
    });

    const cert = db.destruction_certificates.find((c) => c.batch_number === batch_number);
    const destruction = db.destructions.find((d) => d.batch_number === batch_number);
    const formattedDate = new Date(registryRecord.destroyed_at || now).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const reason = `CRITICAL FRAUD: Attempted sale of permanently DESTROYED batch '${batch_number}' (Destroyed on ${formattedDate}).`;

    // Create alert for regulator
    const alertId = db.alerts.length > 0 ? Math.max(...db.alerts.map((a) => a.id)) + 1 : 1;
    db.alerts.push({
      id: alertId,
      batch_number,
      attempted_by_org_id: retailer_org_id,
      severity,
      reason,
      status: 'open',
      created_at: now,
    });

    // Audit log
    const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
    db.audit_logs.push({
      id: auditId,
      actor_org_id: retailer_org_id,
      action: 'SALE_BLOCKED',
      entity: batch_number,
      old_state: 'DESTROYED',
      new_state: 'DESTROYED',
      created_at: now,
    });

    saveLocalDb(db);

    return {
      blocked: true,
      severity,
      message:
        'BLOCKED - this batch was destroyed' +
        (cert?.certificate_no
          ? ` under certificate ${cert.certificate_no}. It cannot be sold.`
          : ` on ${formattedDate}. It cannot be sold.`),
      destroyedAt: registryRecord.destroyed_at,
      certificateNo: cert?.certificate_no,
      facilityName: destruction?.facility_name,
      alertId,
    };
  }

  // STEP 2: Look up batch in batches table
  const batch = db.batches.find((b) => b.batch_number === batch_number);
  if (!batch) {
    // Unknown batch number
    const scanId = db.scans.length > 0 ? Math.max(...db.scans.map((s) => s.id)) + 1 : 1;
    db.scans.push({
      id: scanId,
      batch_number,
      org_id: retailer_org_id,
      action: 'sale_attempt',
      result: 'blocked',
      created_at: now,
    });

    saveLocalDb(db);

    return {
      blocked: true,
      message: 'Unknown batch number',
    };
  }

  const medicine = db.medicines.find((m) => m.id === batch.medicine_id);
  const fullBatch = { ...batch, medicine };

  // STEP 3: If batch.expiry_date < today AND batch.status == ACTIVE
  if (isBatchExpired(batch.expiry_date) && batch.status === 'ACTIVE') {
    const scanId = db.scans.length > 0 ? Math.max(...db.scans.map((s) => s.id)) + 1 : 1;
    db.scans.push({
      id: scanId,
      batch_number,
      org_id: retailer_org_id,
      action: 'sale_attempt',
      result: 'blocked',
      created_at: now,
    });

    const alertId = db.alerts.length > 0 ? Math.max(...db.alerts.map((a) => a.id)) + 1 : 1;
    db.alerts.push({
      id: alertId,
      batch_number,
      attempted_by_org_id: retailer_org_id,
      severity: 'WARNING',
      reason: `WARNING: Attempted sale of expired batch '${batch_number}' (Expired on ${batch.expiry_date}). Sale blocked.`,
      status: 'open',
      created_at: now,
    });

    const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
    db.audit_logs.push({
      id: auditId,
      actor_org_id: retailer_org_id,
      action: 'SALE_BLOCKED',
      entity: batch_number,
      old_state: batch.status,
      new_state: batch.status,
      created_at: now,
    });

    saveLocalDb(db);

    return {
      blocked: true,
      severity: 'WARNING',
      message: 'WARNING - expired batch, sale blocked',
      batch: fullBatch,
      alertId,
    };
  }

  // If batch is in reverse chain (RETURN_INITIATED, RETURN_CONFIRMED, DISPUTED)
  if (batch.status !== 'ACTIVE') {
    const scanId = db.scans.length > 0 ? Math.max(...db.scans.map((s) => s.id)) + 1 : 1;
    db.scans.push({
      id: scanId,
      batch_number,
      org_id: retailer_org_id,
      action: 'sale_attempt',
      result: 'blocked',
      created_at: now,
    });

    const alertId = db.alerts.length > 0 ? Math.max(...db.alerts.map((a) => a.id)) + 1 : 1;
    db.alerts.push({
      id: alertId,
      batch_number,
      attempted_by_org_id: retailer_org_id,
      severity: 'HIGH',
      reason: `REVERSE CHAIN BREACH: Attempted sale of batch '${batch_number}' currently in reverse custody '${batch.status}'.`,
      status: 'open',
      created_at: now,
    });

    saveLocalDb(db);

    return {
      blocked: true,
      severity: 'HIGH',
      message: `BLOCKED - batch is currently in reverse chain state '${batch.status}'`,
      batch: fullBatch,
      alertId,
    };
  }

  // STEP 4: Sale Allowed
  const scanId = db.scans.length > 0 ? Math.max(...db.scans.map((s) => s.id)) + 1 : 1;
  db.scans.push({
    id: scanId,
    batch_number,
    org_id: retailer_org_id,
    action: 'sale_attempt',
    result: 'allowed',
    created_at: now,
  });

  const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId,
    actor_org_id: retailer_org_id,
    action: 'SALE_ALLOWED',
    entity: batch_number,
    old_state: batch.status,
    new_state: batch.status,
    created_at: now,
  });

  saveLocalDb(db);

  return {
    blocked: false,
    message: 'Sale allowed',
    batch: fullBatch,
  };
}

export async function getAlerts(): Promise<Alert[]> {
  const db = loadLocalDb();
  return db.alerts
    .map((a) => ({
      ...a,
      attempted_by: db.orgs.find((o) => o.id === a.attempted_by_org_id),
    }))
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
}

export async function updateAlertStatus(params: {
  alert_id: number;
  status: AlertStatus;
  notes?: string;
  actor_org_id?: number;
}): Promise<{ success: boolean; data?: Alert; error?: string }> {
  const db = loadLocalDb();
  const alert = db.alerts.find((a) => a.id === params.alert_id);
  if (!alert) {
    return { success: false, error: 'Alert record not found' };
  }

  const oldStatus = alert.status;
  alert.status = params.status;

  if (params.notes) {
    alert.reason = `${alert.reason} | Resolution: ${params.notes}`;
  }

  // Audit log entry for regulator investigation action
  const auditId = db.audit_logs.length > 0 ? Math.max(...db.audit_logs.map((a) => a.id)) + 1 : 1;
  db.audit_logs.push({
    id: auditId,
    actor_org_id: params.actor_org_id || 6, // 6 = State Drug Controller
    action: `ALERT_${params.status.toUpperCase()}`,
    entity: alert.batch_number || `ALERT-${alert.id}`,
    old_state: oldStatus,
    new_state: params.status,
    created_at: new Date().toISOString(),
  });

  saveLocalDb(db);

  return {
    success: true,
    data: {
      ...alert,
      attempted_by: db.orgs.find((o) => o.id === alert.attempted_by_org_id),
    },
  };
}

export async function getBatchTimeline(batchNumber: string): Promise<Batch360Data | null> {
  const db = loadLocalDb();
  const batch = db.batches.find((b) => b.batch_number === batchNumber);
  if (!batch) return null;

  const medicine = db.medicines.find((m) => m.id === batch.medicine_id);
  const current_holder = db.orgs.find((o) => o.id === batch.current_holder_org_id);
  const returnRequest = db.return_requests.find((r) => r.batch_number === batchNumber) || null;
  const pickup = returnRequest ? db.pickups.find((p) => p.return_request_id === returnRequest.id) || null : null;
  const destruction = db.destructions.find((d) => d.batch_number === batchNumber) || null;
  const certificate = db.destruction_certificates.find((c) => c.batch_number === batchNumber) || null;
  const isRegisteredDestroyed = db.batch_registry.some((r) => r.batch_number === batchNumber);

  const scans = db.scans.filter((s) => s.batch_number === batchNumber);
  const alerts = db.alerts.filter((a) => a.batch_number === batchNumber);
  const auditLogs = db.audit_logs.filter((a) => a.entity === batchNumber);

  // Build vertical timeline items dynamically from all database events
  const timeline: TimelineEvent[] = [];

  // 1. Batch created event
  timeline.push({
    id: `event-created-${batch.batch_number}`,
    date: batch.created_at || batch.mfg_date || '2025-01-10T10:00:00Z',
    title: 'Batch Manufactured & Registered',
    description: `Manufactured with initial stock of ${batch.quantity} units. MFR Date: ${batch.mfg_date}, Expiry Date: ${batch.expiry_date}.`,
    actor: 'Manufacturer (Cipla Ltd)',
    badge: 'ACTIVE',
    badgeColor: 'blue',
  });

  // 2. Return Request event
  if (returnRequest) {
    const retailer = db.orgs.find((o) => o.id === returnRequest.retailer_org_id);
    timeline.push({
      id: `event-return-${returnRequest.id}`,
      date: returnRequest.created_at || '',
      title: 'Reverse Return Initiated',
      description: `Return initiated for ${returnRequest.qty_claimed} units. Condition reported: "${returnRequest.condition || 'Expired stock'}".`,
      actor: retailer?.name || 'Retail Pharmacy',
      badge: 'RETURN_INITIATED',
      badgeColor: 'amber',
      metadata: { photoUrl: returnRequest.photo_url },
    });
  }

  // 3. Pickup event
  if (pickup) {
    const distributor = db.orgs.find((o) => o.id === pickup.distributor_org_id);
    if (pickup.disputed) {
      timeline.push({
        id: `event-pickup-${pickup.id}`,
        date: pickup.confirmed_at || '',
        title: 'Pickup Disputed - Quantity Mismatch',
        description: `Distributor received ${pickup.qty_received} units vs ${returnRequest?.qty_claimed} claimed units. Dispute flag raised.`,
        actor: distributor?.name || 'Distributor Logistics',
        badge: 'DISPUTED',
        badgeColor: 'rose',
      });
    } else {
      timeline.push({
        id: `event-pickup-${pickup.id}`,
        date: pickup.confirmed_at || '',
        title: 'Distributor Custody Verified & Picked Up',
        description: `Distributor verified intake of ${pickup.qty_received} units. Physical count matches claimed quantity.`,
        actor: distributor?.name || 'Distributor Logistics',
        badge: 'RETURN_CONFIRMED',
        badgeColor: 'purple',
      });
    }
  }

  // 4. Dispute resolved if audit log exists
  const disputeResolvedLog = auditLogs.find((l) => l.action === 'DISPUTE_RESOLVED');
  if (disputeResolvedLog) {
    timeline.push({
      id: `event-resolved-${disputeResolvedLog.id}`,
      date: disputeResolvedLog.created_at || '',
      title: 'Dispute Explicitly Resolved',
      description: `Physical count discrepancy formally resolved and signed off. Custody transitioned to distributor.`,
      actor: 'MedLine Distributors',
      badge: 'RETURN_CONFIRMED',
      badgeColor: 'purple',
    });
  }

  // 5. Destruction event
  if (destruction) {
    const mfr = db.orgs.find((o) => o.id === destruction.manufacturer_org_id);
    timeline.push({
      id: `event-destruct-${destruction.id}`,
      date: destruction.destroyed_at || '',
      title: 'Hazardous Destruction Executed',
      description: `Executed destruction of ${destruction.qty_destroyed} units at ${destruction.facility_name}. Photo/incineration evidence recorded.`,
      actor: mfr?.name || 'Manufacturer Facility',
      badge: 'DESTRUCTION LOGGED',
      badgeColor: 'amber',
      metadata: { evidenceUrl: destruction.evidence_url },
    });
  }

  // 6. Certificate event
  if (certificate) {
    timeline.push({
      id: `event-cert-${certificate.id}`,
      date: certificate.issued_at || '',
      title: 'Destruction Certificate Issued & Locked',
      description: `MedTrace Digital Destruction Certificate #${certificate.certificate_no} issued. Batch identity permanently locked in permanent batch registry.`,
      actor: 'Cipla Compliance Officer',
      badge: 'DESTROYED',
      badgeColor: 'rose',
      metadata: { certificateNo: certificate.certificate_no },
    });
  }

  // 7. Scans / Sale Attempts
  scans.forEach((scan) => {
    const org = db.orgs.find((o) => o.id === scan.org_id);
    if (scan.action === 'sale_attempt') {
      if (scan.result === 'blocked') {
        timeline.push({
          id: `event-scan-${scan.id}`,
          date: scan.created_at || '',
          title: 'FRAUD ALERT: Sale Attempt Blocked',
          description: `An attempt was made to dispense/sell this batch by ${org?.name || 'an entity'}. Blocked by MedTrace fraud engine.`,
          actor: org?.name || 'Point of Sale',
          badge: 'SALE BLOCKED',
          badgeColor: 'rose',
        });
      } else {
        timeline.push({
          id: `event-scan-${scan.id}`,
          date: scan.created_at || '',
          title: 'Authorized Dispense Verified',
          description: `Batch scanned for dispensing at ${org?.name || 'Pharmacy'}. Verified active and unexpired.`,
          actor: org?.name || 'Point of Sale',
          badge: 'SALE ALLOWED',
          badgeColor: 'emerald',
        });
      }
    }
  });

  // Sort timeline chronologically
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    batch: {
      ...batch,
      medicine,
      current_holder,
    },
    timeline,
    returnRequest,
    pickup,
    destruction,
    certificate,
    isRegisteredDestroyed,
    scans,
    alerts,
    auditLogs,
  };
}
