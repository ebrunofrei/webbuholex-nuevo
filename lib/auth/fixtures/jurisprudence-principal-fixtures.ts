import type { JurisprudencePrincipal } from "@/types/jurisprudence-security";

const MOCK_DATE = "2026-07-01T00:00:00.000Z";

export const FIXTURE_ANONYMOUS: JurisprudencePrincipal = {
  kind: "anonymous",
  subjectId: null,
  roles: [],
  authenticationLevel: "anonymous",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_TEST_ONLY: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_test_123",
  roles: ["jurisprudence_reader"],
  authenticationLevel: "test_only",
  issuedAt: MOCK_DATE,
  provider: "test_harness",
};

export const FIXTURE_AUTHENTICATED_READER: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_reader_123",
  roles: ["jurisprudence_reader"],
  authenticationLevel: "authenticated",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_AUTHENTICATED_EDITOR: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_editor_123",
  roles: ["jurisprudence_editor"],
  authenticationLevel: "authenticated",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_REVIEWER: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_reviewer_123",
  roles: ["jurisprudence_reviewer"],
  authenticationLevel: "authenticated",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_PUBLISHER: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_publisher_123",
  roles: ["jurisprudence_publisher"],
  authenticationLevel: "authenticated",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_PUBLISHER_WEAK: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_publisher_weak_123",
  roles: ["jurisprudence_publisher"],
  authenticationLevel: "anonymous",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_AUDITOR: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_auditor_123",
  roles: ["jurisprudence_auditor"],
  authenticationLevel: "authenticated",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_ADMIN: JurisprudencePrincipal = {
  kind: "human",
  subjectId: "usr_admin_123",
  roles: ["jurisprudence_admin"],
  authenticationLevel: "strong_authenticated",
  issuedAt: MOCK_DATE,
};

export const FIXTURE_SYSTEM_SERVICE: JurisprudencePrincipal = {
  kind: "service",
  subjectId: "srv_indexer_123",
  roles: ["system_service"],
  authenticationLevel: "strong_authenticated",
  issuedAt: MOCK_DATE,
};

// Fixture con rol inválido para probar defensividad
export const FIXTURE_INVALID_ROLE = {
  kind: "human",
  subjectId: "usr_invalid_123",
  roles: ["invented_role_not_in_contract"],
  authenticationLevel: "authenticated",
  issuedAt: MOCK_DATE,
} as unknown as JurisprudencePrincipal;
