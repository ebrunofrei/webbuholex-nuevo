-- CREATE RUNTIME AND LOGIN ROLE
DO $$ BEGIN
  CREATE ROLE jurisprudence_publication_command_runtime NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE jurisprudence_publication_command_login LOGIN NOINHERIT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- MEMBERSHIP
GRANT jurisprudence_publication_command_runtime TO jurisprudence_publication_command_login;

-- SCHEMA PRIVILEGE
GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_publication_command_runtime;

-- EXECUTIONS PRIVILEGES
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_publication_executions TO jurisprudence_publication_command_runtime;

-- EXECUTION EVENTS PRIVILEGES
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_execution_events TO jurisprudence_publication_command_runtime;

-- PUBLICATION IDEMPOTENCY PRIVILEGES
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_idempotency TO jurisprudence_publication_command_runtime;

-- OUTBOX PRIVILEGES
GRANT INSERT ON jurisprudence_internal.jurisprudence_publication_outbox TO jurisprudence_publication_command_runtime;
