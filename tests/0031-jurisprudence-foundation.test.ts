import { expect, test, describe } from "vitest";
import * as schema from "@/database/schema/jurisprudence";
import fs from "node:fs";
import path from "node:path";

describe("0031-jurisprudence-foundation", () => {
  const migrationSql = fs.readFileSync(path.join(__dirname, "..", "database", "migrations", "0031_jurisprudence_publication_workflow_foundation.sql"), "utf8");

  test("A. exactly 12 CREATE TABLE statements", () => {
    const tableMatches = migrationSql.match(/CREATE TABLE jurisprudence_internal/g) || [];
    expect(tableMatches.length).toBe(12);
  });

  test("B. all 12 tables ENABLE ROW LEVEL SECURITY", () => {
    const rlsMatches = migrationSql.match(/ENABLE ROW LEVEL SECURITY/g) || [];
    expect(rlsMatches.length).toBe(12);
  });

  test("C. no GRANT DELETE", () => {
    expect(migrationSql).not.toContain("GRANT DELETE");
  });

  test("D. no runtime FOR DELETE", () => {
    expect(migrationSql).not.toContain("FOR DELETE");
  });

  test("E. no broad write FOR ALL and no write policy with omitted command", () => {
    expect(migrationSql).not.toContain("FOR ALL");
    // All CREATE POLICY should explicitly have a FOR clause with a specific operation
    const policies = migrationSql.split('\n').filter(l => l.includes('CREATE POLICY'));
    for (const p of policies) {
      expect(p).toMatch(/FOR (SELECT|INSERT|UPDATE)/);
    }
  });

  test("F. append-only / immutable tables do NOT receive UPDATE grant", () => {
    const lines = migrationSql.split('\n');
    const updateGrants = lines.filter(l => l.includes('GRANT') && l.includes('UPDATE'));

    expect(updateGrants.some(l => l.includes('jurisprudence_editorial_events'))).toBe(false);
    expect(updateGrants.some(l => l.includes('jurisprudence_editorial_idempotency'))).toBe(false);
    expect(updateGrants.some(l => l.includes('jurisprudence_governed_sources'))).toBe(false);
    expect(updateGrants.some(l => l.includes('jurisprudence_publication_dossier_events'))).toBe(false);
    expect(updateGrants.some(l => l.includes('jurisprudence_publication_governance_idempotency'))).toBe(false);
    expect(updateGrants.some(l => l.includes('jurisprudence_publication_authorization_events'))).toBe(false);
    expect(updateGrants.some(l => l.includes('jurisprudence_publication_authorization_idempotency'))).toBe(false);
  });

  test("G. mutable roots DO receive UPDATE", () => {
    const lines = migrationSql.split('\n');
    const updateGrants = lines.filter(l => l.includes('GRANT') && l.includes('UPDATE'));

    expect(updateGrants.some(l => l.includes('jurisprudence_editorial_cases'))).toBe(true);
    expect(updateGrants.some(l => l.includes('jurisprudence_source_bindings'))).toBe(true);
    expect(updateGrants.some(l => l.includes('jurisprudence_publication_dossiers'))).toBe(true);
    expect(updateGrants.some(l => l.includes('jurisprudence_publication_authorization_cases'))).toBe(true);
    expect(updateGrants.some(l => l.includes('jurisprudence_public_projections'))).toBe(true);
  });

  test("H. Authorization still has NO WHERE status = 'authorized'", () => {
    expect(migrationSql).not.toContain("WHERE status = 'authorized'");
  });

  test("I. approved partial unique indexes remain", () => {
    expect(migrationSql).toContain("CREATE UNIQUE INDEX jurisprudence_editorial_cases_active_idx");
    expect(migrationSql).toContain("CREATE UNIQUE INDEX jurisprudence_publication_dossiers_active_idx");
    expect(migrationSql).toContain("CREATE UNIQUE INDEX jurisprudence_public_projections_active_idx");
    expect(migrationSql).toContain("WHERE active = true");
    expect(migrationSql).toContain("WHERE status = 'active_internal'");
  });

  test("J. migration contains no reference modifying jurisprudence_public.published_records", () => {
    expect(migrationSql).not.toContain("jurisprudence_public.published_records");
  });
});
