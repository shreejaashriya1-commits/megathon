-- ====================================================================
-- MEDTRACE SEED DATA
-- ====================================================================

-- 1. Insert Organizations (6 Stakeholder Rosters)
INSERT INTO orgs (id, name, role, location) VALUES
(1, 'Apollo Pharmacy - Ajmer', 'retailer', 'Kaiser Ganj, Ajmer, Rajasthan'),
(2, 'City Medicos', 'retailer', 'Shop 14, Main Market, Malviya Nagar, Jaipur, Rajasthan'),
(3, 'Sunrise Pharmacy', 'retailer', 'G-22 Commercial Complex, Sector 18, Noida, Uttar Pradesh'),
(4, 'MedLine Distributors', 'distributor', 'Bhiwandi Central Logistics Hub, Maharashtra'),
(5, 'Cipla Ltd', 'manufacturer', 'Verna Industrial Estate, Salcete, Goa'),
(6, 'State Drug Controller', 'regulator', 'FDA Bhavan, Kotla Road, New Delhi')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Medicines
INSERT INTO medicines (id, name, generic_name, manufacturer_org_id, category, dosage_form) VALUES
(1, 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', 5, 'Antibiotic', 'Capsule'),
(2, 'Paracetamol 650mg', 'Acetaminophen', 5, 'Analgesic / Antipyretic', 'Tablet'),
(3, 'Azithromycin 500mg', 'Azithromycin Dihydrate', 5, 'Antibiotic', 'Tablet'),
(4, 'Metformin 500mg', 'Metformin Hydrochloride', 5, 'Antidiabetic', 'Extended-Release Tablet'),
(5, 'Atorvastatin 20mg', 'Atorvastatin Calcium', 5, 'Cardiovascular / Statin', 'Film-Coated Tablet')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Batches

-- Batch A: AMX-DEMO-001 (Pre-destroyed batch for instant fraud detection)
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('AMX-DEMO-001', 1, 100, '2025-01-10', '2026-01-10', 5, 'DESTROYED', 'AMX-DEMO-001-TOKEN', '2025-01-10 10:00:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Batch B: PCM2026A01 (Expired active batch for the live end-to-end hackathon workflow)
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('PCM2026A01', 2, 100, '2025-08-01', '2026-08-25', 1, 'ACTIVE', 'PCM2026A01-TOKEN', '2025-08-01 09:30:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Realistic Inventory Batches for Retailer 1 (Apollo Pharmacy - Ajmer)
-- Normal (> 60 days)
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('AZI-2026-088', 3, 120, '2026-02-15', '2027-02-15', 1, 'ACTIVE', 'AZI-2026-088-TOKEN', '2026-02-15 11:00:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Expiring Soon (31-60 days: ~45 days)
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('MET-2026-045', 4, 300, '2025-10-25', '2026-10-25', 1, 'ACTIVE', 'MET-2026-045-TOKEN', '2025-10-25 14:15:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Urgent (0-30 days: ~15 days)
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('ATO-2026-012', 5, 180, '2025-09-25', '2026-09-25', 1, 'ACTIVE', 'ATO-2026-012-TOKEN', '2025-09-25 08:45:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Another Expired Batch for Apollo Pharmacy
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('PCM-EXP-999', 2, 80, '2025-08-10', '2026-08-10', 1, 'ACTIVE', 'PCM-EXP-999-TOKEN', '2025-08-10 16:20:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Inventory for Retailer 2 (City Medicos) - demonstrates inventory isolation
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('CM-AMX-2026', 1, 90, '2026-01-15', '2027-01-15', 2, 'ACTIVE', 'CM-AMX-2026-TOKEN', '2026-01-15 09:00:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- Inventory for Retailer 3 (Sunrise Pharmacy) - demonstrates inventory isolation
INSERT INTO batches (batch_number, medicine_id, quantity, mfg_date, expiry_date, current_holder_org_id, status, qr_token, created_at)
VALUES ('SUN-AZI-2026', 3, 60, '2026-02-10', '2027-02-10', 3, 'ACTIVE', 'SUN-AZI-2026-TOKEN', '2026-02-10 10:30:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- 4. Complete History for Pre-Destroyed Batch AMX-DEMO-001
-- Return Request
INSERT INTO return_requests (id, batch_number, retailer_org_id, qty_claimed, condition, photo_url, status, created_at)
VALUES (1, 'AMX-DEMO-001', 1, 100, 'Expired foil blister packs; outer carton intact', '/demo/evidence/amx-return.jpg', 'confirmed', '2026-02-01 10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Pickup
INSERT INTO pickups (id, return_request_id, distributor_org_id, qty_received, disputed, confirmed_at)
VALUES (1, 1, 4, 100, false, '2026-02-05 14:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- Destruction
INSERT INTO destructions (id, batch_number, manufacturer_org_id, facility_name, qty_destroyed, evidence_url, destroyed_at)
VALUES (1, 'AMX-DEMO-001', 5, 'Cipla High-Temperature Incineration Unit 4, Verna', 100, '/demo/evidence/amx-incineration.jpg', '2026-02-12 11:15:00Z')
ON CONFLICT (id) DO NOTHING;

-- Destruction Certificate
INSERT INTO destruction_certificates (id, batch_number, destruction_id, certificate_no, issued_at)
VALUES (1, 'AMX-DEMO-001', 1, 'DC-DEMO-001', '2026-02-12 11:20:00Z')
ON CONFLICT (id) DO NOTHING;

-- 5. Batch Registry (PERMANENT DESTROYED RECORD)
INSERT INTO batch_registry (batch_number, terminal_status, destroyed_at)
VALUES ('AMX-DEMO-001', 'DESTROYED', '2026-02-12 11:20:00Z')
ON CONFLICT (batch_number) DO NOTHING;

-- 6. Audit Logs for Batch AMX-DEMO-001
INSERT INTO audit_logs (actor_org_id, action, entity, old_state, new_state, created_at) VALUES
(5, 'BATCH_CREATED', 'AMX-DEMO-001', NULL, 'ACTIVE', '2025-01-10 10:00:00Z'),
(1, 'RETURN_INITIATED', 'AMX-DEMO-001', 'ACTIVE', 'RETURN_INITIATED', '2026-02-01 10:00:00Z'),
(4, 'PICKUP_CONFIRMED', 'AMX-DEMO-001', 'RETURN_INITIATED', 'RETURN_CONFIRMED', '2026-02-05 14:30:00Z'),
(5, 'DESTRUCTION_LOGGED', 'AMX-DEMO-001', 'RETURN_CONFIRMED', 'RETURN_CONFIRMED', '2026-02-12 11:15:00Z'),
(5, 'CERTIFICATE_ISSUED', 'AMX-DEMO-001', 'RETURN_CONFIRMED', 'DESTROYED', '2026-02-12 11:20:00Z'),
(5, 'BATCH_DESTROYED', 'AMX-DEMO-001', 'RETURN_CONFIRMED', 'DESTROYED', '2026-02-12 11:20:00Z');

-- Reset sequences for serial IDs
SELECT setval('orgs_id_seq', (SELECT MAX(id) FROM orgs));
SELECT setval('medicines_id_seq', (SELECT MAX(id) FROM medicines));
SELECT setval('return_requests_id_seq', (SELECT MAX(id) FROM return_requests));
SELECT setval('pickups_id_seq', (SELECT MAX(id) FROM pickups));
SELECT setval('destructions_id_seq', (SELECT MAX(id) FROM destructions));
SELECT setval('destruction_certificates_id_seq', (SELECT MAX(id) FROM destruction_certificates));
