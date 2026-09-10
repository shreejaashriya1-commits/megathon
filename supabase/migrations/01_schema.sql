-- ====================================================================
-- MEDTRACE DATABASE SCHEMA
-- Pharmaceutical Reverse Chain Compliance & Re-entry Detection
-- ====================================================================

-- Drop existing tables if re-running
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS batch_registry CASCADE;
DROP TABLE IF EXISTS destruction_certificates CASCADE;
DROP TABLE IF EXISTS destructions CASCADE;
DROP TABLE IF EXISTS pickups CASCADE;
DROP TABLE IF EXISTS return_requests CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS orgs CASCADE;

-- 1. Organizations
CREATE TABLE orgs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('retailer', 'distributor', 'manufacturer', 'regulator')),
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Medicines
CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    manufacturer_org_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    category TEXT,
    dosage_form TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Batches
CREATE TABLE batches (
    batch_number TEXT PRIMARY KEY,
    medicine_id INT REFERENCES medicines(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity >= 0),
    mfg_date DATE,
    expiry_date DATE NOT NULL,
    current_holder_org_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURN_INITIATED', 'RETURN_CONFIRMED', 'DISPUTED', 'DESTROYED')),
    qr_token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Return Requests
CREATE TABLE return_requests (
    id SERIAL PRIMARY KEY,
    batch_number TEXT REFERENCES batches(batch_number) ON DELETE RESTRICT,
    retailer_org_id INT REFERENCES orgs(id) ON DELETE RESTRICT,
    qty_claimed INT NOT NULL CHECK (qty_claimed > 0),
    condition TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Pickups
CREATE TABLE pickups (
    id SERIAL PRIMARY KEY,
    return_request_id INT REFERENCES return_requests(id) ON DELETE RESTRICT,
    distributor_org_id INT REFERENCES orgs(id) ON DELETE RESTRICT,
    qty_received INT NOT NULL CHECK (qty_received >= 0),
    disputed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Destructions
CREATE TABLE destructions (
    id SERIAL PRIMARY KEY,
    batch_number TEXT REFERENCES batches(batch_number) ON DELETE RESTRICT,
    manufacturer_org_id INT REFERENCES orgs(id) ON DELETE RESTRICT,
    facility_name TEXT NOT NULL,
    qty_destroyed INT NOT NULL CHECK (qty_destroyed > 0),
    evidence_url TEXT,
    destroyed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Destruction Certificates
CREATE TABLE destruction_certificates (
    id SERIAL PRIMARY KEY,
    batch_number TEXT REFERENCES batches(batch_number) ON DELETE RESTRICT,
    destruction_id INT REFERENCES destructions(id) ON DELETE RESTRICT,
    certificate_no TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Permanent Destroyed Registry (NEVER DELETE)
CREATE TABLE batch_registry (
    batch_number TEXT PRIMARY KEY,
    terminal_status TEXT NOT NULL DEFAULT 'DESTROYED',
    destroyed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Scans (Auditing every lookup and sale attempt)
CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    batch_number TEXT,
    org_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('lookup', 'sale_attempt')),
    result TEXT NOT NULL CHECK (result IN ('allowed', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Alerts (Normalized & Classified)
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    batch_number TEXT,
    attempted_by_org_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    severity TEXT NOT NULL DEFAULT 'CRITICAL' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'WARNING')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'acknowledged')),
    category TEXT DEFAULT 'SYSTEM_OPERATIONAL',
    subcategory TEXT,
    risk_score INT DEFAULT 0,
    serial_id TEXT,
    organization_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    detected_actor TEXT,
    current_holder TEXT,
    source_event TEXT,
    evidence TEXT,
    assigned_stakeholder TEXT,
    case_id TEXT,
    escalation_level TEXT DEFAULT 'NONE',
    occurrence_count INT DEFAULT 1,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Investigation Cases (Grouped Incidents)
CREATE TABLE investigation_cases (
    id TEXT PRIMARY KEY,
    case_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'WARNING')),
    risk_score INT NOT NULL DEFAULT 0,
    primary_organization_id INT REFERENCES orgs(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE', 'CLOSED')),
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    occurrence_count INT NOT NULL DEFAULT 1,
    escalation_level TEXT NOT NULL DEFAULT 'NONE' CHECK (escalation_level IN ('NONE', 'ORG_LEVEL', 'COMPLIANCE', 'REGULATOR')),
    assigned_stakeholder TEXT NOT NULL,
    assigned_org_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    affected_batches JSONB DEFAULT '[]'::jsonb,
    affected_serials JSONB DEFAULT '[]'::jsonb,
    related_alert_ids JSONB DEFAULT '[]'::jsonb,
    ai_anomaly_data JSONB DEFAULT '{}'::jsonb,
    recommended_action TEXT,
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Stakeholder Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_role TEXT NOT NULL,
    recipient_org_id INT REFERENCES orgs(id) ON DELETE CASCADE,
    alert_id INT REFERENCES alerts(id) ON DELETE SET NULL,
    case_id TEXT REFERENCES investigation_cases(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Organization Risk Profiles
CREATE TABLE organization_risk_profiles (
    org_id INT PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
    org_name TEXT NOT NULL,
    role TEXT NOT NULL,
    total_cases INT DEFAULT 0,
    open_cases INT DEFAULT 0,
    discrepancy_count INT DEFAULT 0,
    unauthorized_custody_count INT DEFAULT 0,
    duplicate_serial_count INT DEFAULT 0,
    risk_score INT DEFAULT 0,
    risk_tier TEXT DEFAULT 'LOW',
    last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    risk_factors JSONB DEFAULT '[]'::jsonb
);

-- 14. Tamper-evident Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    actor_org_id INT REFERENCES orgs(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    old_state TEXT,
    new_state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance & quick queries
CREATE INDEX idx_batches_holder ON batches(current_holder_org_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_qr_token ON batches(qr_token);
CREATE INDEX idx_return_requests_batch ON return_requests(batch_number);
CREATE INDEX idx_return_requests_status ON return_requests(status);
CREATE INDEX idx_pickups_return_req ON pickups(return_request_id);
CREATE INDEX idx_destructions_batch ON destructions(batch_number);
CREATE INDEX idx_scans_batch ON scans(batch_number);
CREATE INDEX idx_alerts_batch ON alerts(batch_number);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_case ON alerts(case_id);
CREATE INDEX idx_cases_severity ON investigation_cases(severity);
CREATE INDEX idx_cases_status ON investigation_cases(status);
CREATE INDEX idx_cases_org ON investigation_cases(primary_organization_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_org_id, recipient_role);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Enable Supabase Realtime for alerts and investigation_cases
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE investigation_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
