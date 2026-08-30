-- 0032_jurisprudence_role_assignment_persistence.sql

CREATE TABLE authorization.operator_jurisprudence_roles (
  operator_id uuid NOT NULL REFERENCES authorization.operators(id) ON DELETE RESTRICT,
  role varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_id, role)
);

CREATE TABLE authorization.operator_jurisprudence_role_sets (
  operator_id uuid NOT NULL PRIMARY KEY REFERENCES authorization.operators(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE ROLE jurisprudence_authorization_login LOGIN NOINHERIT;
CREATE ROLE jurisprudence_authorization_runtime NOLOGIN;

GRANT jurisprudence_authorization_runtime TO jurisprudence_authorization_login;

GRANT USAGE ON SCHEMA authorization TO jurisprudence_authorization_runtime;

GRANT SELECT ON authorization.operators TO jurisprudence_authorization_runtime;
GRANT SELECT ON authorization.external_identity_bindings TO jurisprudence_authorization_runtime;
GRANT SELECT ON authorization.operator_jurisprudence_roles TO jurisprudence_authorization_runtime;
GRANT SELECT ON authorization.operator_jurisprudence_role_sets TO jurisprudence_authorization_runtime;
