import "server-only";
import { getComplaintsApiDatabase } from "@/database/client";
import { createComplaintsApiPersistenceAdapter } from "@/database/adapters/complaints-postgres.adapter";
import { createComplaintsRepository } from "@/database/repositories/complaints.repository";
import { createComplaint } from "@/lib/complaints/create-complaint";
import crypto from "node:crypto";
import { CreateComplaintResult } from "@/database/repositories/complaints.types";
import { ComplaintPersistenceError, SanitizedDatabaseConstraintError } from "@/database/repositories/complaints.errors";
import { ComplaintsServiceUnavailableError } from "./complaints-errors";

export async function submitComplaintRuntime(
  input: unknown,
  idempotencyKey: string
): Promise<CreateComplaintResult> {
  let finalTokenSecret = process.env.COMPLAINTS_TOKEN_SECRET_V1;
  let finalIdempotencySecret = process.env.COMPLAINTS_IDEMPOTENCY_SECRET_V1;

  if (process.env.NODE_ENV === "development") {
    finalTokenSecret = finalTokenSecret || "32_byte_fallback_secret_for_local_env_only".padEnd(32, "x");
    finalIdempotencySecret = finalIdempotencySecret || "32_byte_fallback_secret_for_local_env_only_idem".padEnd(32, "x");
  }

  if (!finalTokenSecret) {
    throw new Error("missing_complaints_token_secret");
  }

  if (!finalIdempotencySecret) {
    throw new Error("missing_complaints_idempotency_secret");
  }

  const db = getComplaintsApiDatabase();
  const adapter = createComplaintsApiPersistenceAdapter(db);
  const repo = createComplaintsRepository(adapter);

  const deps = {
    repository: repo,
    clock: { now: () => new Date() },
    randomBytes: (size: number) => crypto.randomBytes(size),
    tokenSecret: { version: 1, secret: finalTokenSecret },
    idempotencySecret: { version: 1, secret: finalIdempotencySecret },
    holidays: new Set<string>(),
  };

  try {
    return await createComplaint(input, idempotencyKey, deps);
  } catch (error) {
    if (error instanceof ComplaintPersistenceError || error instanceof SanitizedDatabaseConstraintError) {
      throw new ComplaintsServiceUnavailableError("complaints_persistence_failed");
    }
    throw error;
  }
}
