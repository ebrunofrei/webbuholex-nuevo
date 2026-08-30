import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Migration 0032 Static Security", () => {
  const migrationPath = path.join(__dirname, "../database/migrations/0032_jurisprudence_role_assignment_persistence.sql");
  const content = fs.readFileSync(migrationPath, "utf-8").toUpperCase();

  it("contains exactly two Jurisprudence authorization tables", () => {
    expect(content).toContain("CREATE TABLE AUTHORIZATION.OPERATOR_JURISPRUDENCE_ROLES");
    expect(content).toContain("CREATE TABLE AUTHORIZATION.OPERATOR_JURISPRUDENCE_ROLE_SETS");
    const createTableCount = (content.match(/CREATE TABLE/g) || []).length;
    expect(createTableCount).toBe(2);
  });

  it("creates LOGIN jurisprudence_authorization_login", () => {
    expect(content).toContain("CREATE ROLE JURISPRUDENCE_AUTHORIZATION_LOGIN LOGIN NOINHERIT;");
  });

  it("creates NOLOGIN jurisprudence_authorization_runtime", () => {
    expect(content).toContain("CREATE ROLE JURISPRUDENCE_AUTHORIZATION_RUNTIME NOLOGIN;");
  });

  it("grants runtime TO login", () => {
    expect(content).toContain("GRANT JURISPRUDENCE_AUTHORIZATION_RUNTIME TO JURISPRUDENCE_AUTHORIZATION_LOGIN;");
  });

  it("grants USAGE on authorization schema", () => {
    expect(content).toContain("GRANT USAGE ON SCHEMA AUTHORIZATION TO JURISPRUDENCE_AUTHORIZATION_RUNTIME;");
  });

  it("grants SELECT on exact four tables", () => {
    expect(content).toContain("GRANT SELECT ON AUTHORIZATION.OPERATORS TO JURISPRUDENCE_AUTHORIZATION_RUNTIME;");
    expect(content).toContain("GRANT SELECT ON AUTHORIZATION.EXTERNAL_IDENTITY_BINDINGS TO JURISPRUDENCE_AUTHORIZATION_RUNTIME;");
    expect(content).toContain("GRANT SELECT ON AUTHORIZATION.OPERATOR_JURISPRUDENCE_ROLES TO JURISPRUDENCE_AUTHORIZATION_RUNTIME;");
    expect(content).toContain("GRANT SELECT ON AUTHORIZATION.OPERATOR_JURISPRUDENCE_ROLE_SETS TO JURISPRUDENCE_AUTHORIZATION_RUNTIME;");

    const grantSelectCount = (content.match(/GRANT SELECT ON/g) || []).length;
    expect(grantSelectCount).toBe(4);
  });

  it("contains NO INSERT, NO UPDATE, NO DELETE", () => {
    expect(content).not.toContain("GRANT INSERT");
    expect(content).not.toContain("GRANT UPDATE");
    expect(content).not.toContain("GRANT DELETE");
  });

  it("contains NO password and NO real identity seed", () => {
    expect(content).not.toContain("PASSWORD");
    expect(content).not.toContain("INSERT INTO AUTHORIZATION.EXTERNAL_IDENTITY_BINDINGS");
  });

  it("contains CHECK version >= 1 and ON DELETE RESTRICT", () => {
    expect(content).toContain("CHECK (VERSION >= 1)");
    expect(content).toContain("ON DELETE RESTRICT");
  });

  it("contains NO RLS statements", () => {
    expect(content).not.toContain("ROW LEVEL SECURITY");
    expect(content).not.toContain("CREATE POLICY");
  });
});
