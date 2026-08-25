-- Migration 0031: Jurisprudence Publication Workflow Foundation

-- 1. Editorial Tables
CREATE TABLE jurisprudence_internal.jurisprudence_editorial_cases (
    case_id VARCHAR PRIMARY KEY,
    record_id VARCHAR NOT NULL,
    record_version INTEGER NOT NULL CHECK (record_version > 0),
    case_version INTEGER NOT NULL CHECK (case_version > 0),
    active BOOLEAN NOT NULL,
    payload_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_editorial_record FOREIGN KEY (record_id, record_version)
        REFERENCES jurisprudence_internal.jurisprudence_record_versions (record_id, version) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX jurisprudence_editorial_cases_active_idx
ON jurisprudence_internal.jurisprudence_editorial_cases (record_id, record_version)
WHERE active = true;

CREATE TABLE jurisprudence_internal.jurisprudence_editorial_events (
    event_id VARCHAR PRIMARY KEY,
    case_id VARCHAR NOT NULL,
    sequence INTEGER NOT NULL CHECK (sequence > 0),
    event_type VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_editorial_event_case FOREIGN KEY (case_id)
        REFERENCES jurisprudence_internal.jurisprudence_editorial_cases (case_id) ON DELETE RESTRICT,
    CONSTRAINT jurisprudence_editorial_events_seq_unique UNIQUE (case_id, sequence)
);

CREATE TABLE jurisprudence_internal.jurisprudence_editorial_idempotency (
    idempotency_key VARCHAR PRIMARY KEY,
    command_fingerprint VARCHAR NOT NULL,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Governance Tables
CREATE TABLE jurisprudence_internal.jurisprudence_governed_sources (
    source_id VARCHAR PRIMARY KEY,
    payload_json JSONB NOT NULL
);

CREATE TABLE jurisprudence_internal.jurisprudence_source_bindings (
    binding_id VARCHAR PRIMARY KEY,
    record_id VARCHAR NOT NULL,
    record_version INTEGER NOT NULL CHECK (record_version > 0),
    binding_status VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    CONSTRAINT fk_source_binding_record FOREIGN KEY (record_id, record_version)
        REFERENCES jurisprudence_internal.jurisprudence_record_versions (record_id, version) ON DELETE RESTRICT
);

CREATE TABLE jurisprudence_internal.jurisprudence_publication_dossiers (
    dossier_id VARCHAR PRIMARY KEY,
    record_id VARCHAR NOT NULL,
    record_version INTEGER NOT NULL CHECK (record_version > 0),
    dossier_version INTEGER NOT NULL CHECK (dossier_version > 0),
    active BOOLEAN NOT NULL,
    payload_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_publication_dossier_record FOREIGN KEY (record_id, record_version)
        REFERENCES jurisprudence_internal.jurisprudence_record_versions (record_id, version) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX jurisprudence_publication_dossiers_active_idx
ON jurisprudence_internal.jurisprudence_publication_dossiers (record_id, record_version)
WHERE active = true;

CREATE TABLE jurisprudence_internal.jurisprudence_publication_dossier_events (
    event_id VARCHAR PRIMARY KEY,
    dossier_id VARCHAR NOT NULL,
    sequence INTEGER NOT NULL CHECK (sequence > 0),
    event_type VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dossier_event_dossier FOREIGN KEY (dossier_id)
        REFERENCES jurisprudence_internal.jurisprudence_publication_dossiers (dossier_id) ON DELETE RESTRICT,
    CONSTRAINT jurisprudence_pub_dossier_events_seq_unique UNIQUE (dossier_id, sequence)
);

CREATE TABLE jurisprudence_internal.jurisprudence_publication_governance_idempotency (
    idempotency_key VARCHAR PRIMARY KEY,
    command_fingerprint VARCHAR NOT NULL,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Authorization Tables
CREATE TABLE jurisprudence_internal.jurisprudence_publication_authorization_cases (
    authorization_case_id VARCHAR PRIMARY KEY,
    record_id VARCHAR NOT NULL,
    record_version INTEGER NOT NULL CHECK (record_version > 0),
    authorization_version INTEGER NOT NULL CHECK (authorization_version > 0),
    status VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    CONSTRAINT fk_authorization_case_record FOREIGN KEY (record_id, record_version)
        REFERENCES jurisprudence_internal.jurisprudence_record_versions (record_id, version) ON DELETE RESTRICT
);

CREATE TABLE jurisprudence_internal.jurisprudence_publication_authorization_events (
    event_id VARCHAR PRIMARY KEY,
    authorization_case_id VARCHAR NOT NULL,
    sequence INTEGER NOT NULL CHECK (sequence > 0),
    event_type VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_auth_event_case FOREIGN KEY (authorization_case_id)
        REFERENCES jurisprudence_internal.jurisprudence_publication_authorization_cases (authorization_case_id) ON DELETE RESTRICT,
    CONSTRAINT jurisprudence_auth_events_seq_unique UNIQUE (authorization_case_id, sequence)
);

CREATE TABLE jurisprudence_internal.jurisprudence_publication_authorization_idempotency (
    idempotency_key VARCHAR PRIMARY KEY,
    command_fingerprint VARCHAR NOT NULL,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Execution Internal Projection
CREATE TABLE jurisprudence_internal.jurisprudence_public_projections (
    projection_id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL,
    record_id VARCHAR NOT NULL,
    record_version INTEGER NOT NULL CHECK (record_version > 0),
    status VARCHAR NOT NULL,
    payload_json JSONB NOT NULL,
    CONSTRAINT fk_public_projection_execution FOREIGN KEY (execution_id)
        REFERENCES jurisprudence_internal.jurisprudence_publication_executions (execution_id) ON DELETE RESTRICT,
    CONSTRAINT fk_public_projection_record FOREIGN KEY (record_id, record_version)
        REFERENCES jurisprudence_internal.jurisprudence_record_versions (record_id, version) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX jurisprudence_public_projections_active_idx
ON jurisprudence_internal.jurisprudence_public_projections (record_id, record_version)
WHERE status = 'active_internal';

-- 5. Row Level Security and Role Grants
-- Enable RLS
ALTER TABLE jurisprudence_internal.jurisprudence_editorial_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_editorial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_editorial_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_governed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_source_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_publication_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_publication_dossier_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_publication_governance_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_publication_authorization_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_publication_authorization_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_publication_authorization_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudence_internal.jurisprudence_public_projections ENABLE ROW LEVEL SECURITY;

-- Grants for Read Role
GRANT SELECT ON jurisprudence_internal.jurisprudence_editorial_cases TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_editorial_events TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_editorial_idempotency TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_governed_sources TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_source_bindings TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_dossiers TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_dossier_events TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_governance_idempotency TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_authorization_cases TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_authorization_events TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_authorization_idempotency TO jurisprudence_internal_read_runtime;
GRANT SELECT ON jurisprudence_internal.jurisprudence_public_projections TO jurisprudence_internal_read_runtime;

-- Grants for Write Role
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_editorial_cases TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_editorial_events TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_editorial_idempotency TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_governed_sources TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_source_bindings TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_publication_dossiers TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_dossier_events TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_governance_idempotency TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_publication_authorization_cases TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_authorization_events TO jurisprudence_internal_write_runtime;
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_authorization_idempotency TO jurisprudence_internal_write_runtime;

-- Grants for Publication Command Role
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_public_projections TO jurisprudence_publication_command_runtime;

-- RLS Policies - Read Role
CREATE POLICY jurisprudence_internal_read_runtime_select ON jurisprudence_internal.jurisprudence_editorial_cases FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_events ON jurisprudence_internal.jurisprudence_editorial_events FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_idem ON jurisprudence_internal.jurisprudence_editorial_idempotency FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_src ON jurisprudence_internal.jurisprudence_governed_sources FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_bind ON jurisprudence_internal.jurisprudence_source_bindings FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_dossier ON jurisprudence_internal.jurisprudence_publication_dossiers FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_dossier_evt ON jurisprudence_internal.jurisprudence_publication_dossier_events FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_gov_idem ON jurisprudence_internal.jurisprudence_publication_governance_idempotency FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_auth ON jurisprudence_internal.jurisprudence_publication_authorization_cases FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_auth_evt ON jurisprudence_internal.jurisprudence_publication_authorization_events FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_auth_idem ON jurisprudence_internal.jurisprudence_publication_authorization_idempotency FOR SELECT TO jurisprudence_internal_read_runtime USING (true);
CREATE POLICY jurisprudence_internal_read_runtime_select_proj ON jurisprudence_internal.jurisprudence_public_projections FOR SELECT TO jurisprudence_internal_read_runtime USING (true);

-- RLS Policies - Write Role
CREATE POLICY jurisprudence_internal_write_runtime_select ON jurisprudence_internal.jurisprudence_editorial_cases FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert ON jurisprudence_internal.jurisprudence_editorial_cases FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);
CREATE POLICY jurisprudence_internal_write_runtime_update ON jurisprudence_internal.jurisprudence_editorial_cases FOR UPDATE TO jurisprudence_internal_write_runtime USING (true) WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_events ON jurisprudence_internal.jurisprudence_editorial_events FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_events ON jurisprudence_internal.jurisprudence_editorial_events FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_idem ON jurisprudence_internal.jurisprudence_editorial_idempotency FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_idem ON jurisprudence_internal.jurisprudence_editorial_idempotency FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_src ON jurisprudence_internal.jurisprudence_governed_sources FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_src ON jurisprudence_internal.jurisprudence_governed_sources FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_bind ON jurisprudence_internal.jurisprudence_source_bindings FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_bind ON jurisprudence_internal.jurisprudence_source_bindings FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);
CREATE POLICY jurisprudence_internal_write_runtime_update_bind ON jurisprudence_internal.jurisprudence_source_bindings FOR UPDATE TO jurisprudence_internal_write_runtime USING (true) WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_dossier ON jurisprudence_internal.jurisprudence_publication_dossiers FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_dossier ON jurisprudence_internal.jurisprudence_publication_dossiers FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);
CREATE POLICY jurisprudence_internal_write_runtime_update_dossier ON jurisprudence_internal.jurisprudence_publication_dossiers FOR UPDATE TO jurisprudence_internal_write_runtime USING (true) WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_dossier_evt ON jurisprudence_internal.jurisprudence_publication_dossier_events FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_dossier_evt ON jurisprudence_internal.jurisprudence_publication_dossier_events FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_gov_idem ON jurisprudence_internal.jurisprudence_publication_governance_idempotency FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_gov_idem ON jurisprudence_internal.jurisprudence_publication_governance_idempotency FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_auth ON jurisprudence_internal.jurisprudence_publication_authorization_cases FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_auth ON jurisprudence_internal.jurisprudence_publication_authorization_cases FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);
CREATE POLICY jurisprudence_internal_write_runtime_update_auth ON jurisprudence_internal.jurisprudence_publication_authorization_cases FOR UPDATE TO jurisprudence_internal_write_runtime USING (true) WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_auth_evt ON jurisprudence_internal.jurisprudence_publication_authorization_events FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_auth_evt ON jurisprudence_internal.jurisprudence_publication_authorization_events FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

CREATE POLICY jurisprudence_internal_write_runtime_select_auth_idem ON jurisprudence_internal.jurisprudence_publication_authorization_idempotency FOR SELECT TO jurisprudence_internal_write_runtime USING (true);
CREATE POLICY jurisprudence_internal_write_runtime_insert_auth_idem ON jurisprudence_internal.jurisprudence_publication_authorization_idempotency FOR INSERT TO jurisprudence_internal_write_runtime WITH CHECK (true);

-- RLS Policies - Publication Command Role
CREATE POLICY jurisprudence_publication_command_runtime_select_proj ON jurisprudence_internal.jurisprudence_public_projections FOR SELECT TO jurisprudence_publication_command_runtime USING (true);
CREATE POLICY jurisprudence_publication_command_runtime_insert_proj ON jurisprudence_internal.jurisprudence_public_projections FOR INSERT TO jurisprudence_publication_command_runtime WITH CHECK (true);
CREATE POLICY jurisprudence_publication_command_runtime_update_proj ON jurisprudence_internal.jurisprudence_public_projections FOR UPDATE TO jurisprudence_publication_command_runtime USING (true) WITH CHECK (true);
