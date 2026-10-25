import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { dynamic as adminLayoutDynamic } from "@/app/admin/layout";
import { dynamic as legacyComplaintsDynamic } from "@/app/app/reclamos/page";
import { dynamic as legacyComplaintDetailDynamic } from "@/app/app/reclamos/[complaintId]/page";
import { dynamic as legacyCulqiDynamic } from "@/app/app/admin/sandbox/culqi-token/page";
import { readAuthorizationDatabaseConfig } from "@/database/config";

describe("BUHOLEX-AUTH-A0.4-FIX5: Request-Time Dynamic Admin Backoffice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Dynamic Route Segment Boundaries", () => {
    it("admin root layout defines dynamic = 'force-dynamic' at the highest segment boundary", () => {
      expect(adminLayoutDynamic).toBe("force-dynamic");
    });

    it("legacy /app/reclamos redirect page defines dynamic = 'force-dynamic'", () => {
      expect(legacyComplaintsDynamic).toBe("force-dynamic");
    });

    it("legacy /app/reclamos/[complaintId] redirect page defines dynamic = 'force-dynamic'", () => {
      expect(legacyComplaintDetailDynamic).toBe("force-dynamic");
    });

    it("legacy /app/admin/sandbox/culqi-token redirect page defines dynamic = 'force-dynamic'", () => {
      expect(legacyCulqiDynamic).toBe("force-dynamic");
    });
  });

  describe("2. Build-Time Database Prohibition", () => {
    it("preserves fail-closed behavior when authorization database config is absent", () => {
      const emptyEnv: Record<string, string | undefined> = {};
      expect(() => readAuthorizationDatabaseConfig(emptyEnv)).toThrow(
        "authorization_database_configuration_missing"
      );
    });

    it("preserves runtime fail-closed behavior when authorization DB is invalid", () => {
      const invalidEnv: Record<string, string | undefined> = {
        DATABASE_AUTHORIZATION_URL: "not-a-valid-pg-url",
      };
      expect(() => readAuthorizationDatabaseConfig(invalidEnv)).toThrow(
        "authorization_database_configuration_invalid"
      );
    });

    it("accepts valid authorization database config at request runtime", () => {
      const validEnv: Record<string, string | undefined> = {
        DATABASE_AUTHORIZATION_URL: "postgresql://user:pass@sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
      };
      const config = readAuthorizationDatabaseConfig(validEnv);
      expect(config.url).toBe(validEnv.DATABASE_AUTHORIZATION_URL);
      expect(config.prepare).toBe(false);
    });
  });
});