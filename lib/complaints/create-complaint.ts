import "server-only";
import { ComplaintsRepository } from "@/database/repositories/complaints.repository";
import { Clock, VersionedHmacSecret, CreateComplaintResult } from "@/database/repositories/complaints.types";
import { RandomBytesSource, createComplaintPrivateToken } from "./complaint-identifiers";
import { createComplaintPayloadSnapshot } from "@/database/mappers/complaints";
import { buildComplaintSubmission } from "./complaint.builder";
import { deriveComplaintAccessTokenDigest, deriveComplaintIdempotencyDigest, hashCanonicalJson } from "./crypto";
import { calculatePreliminaryComplaintDeadline } from "./complaint-deadline";
import { ComplaintsValidationError, ComplaintsInternalError } from "./complaints-errors";

export interface CreateComplaintDependencies {
  readonly repository: ComplaintsRepository;
  readonly clock: Clock;
  readonly randomBytes: RandomBytesSource;
  readonly tokenSecret: VersionedHmacSecret;
  readonly idempotencySecret: VersionedHmacSecret;
  readonly holidays: ReadonlySet<string>;
}

export async function createComplaint(
  input: unknown,
  idempotencyKey: string,
  deps: CreateComplaintDependencies
): Promise<CreateComplaintResult> {
  const mergedInput = typeof input === "object" && input !== null
    ? { ...input, idempotencyKey }
    : input;

  const buildResult = buildComplaintSubmission(mergedInput);
  if (!buildResult.ok) {
    throw new ComplaintsValidationError("complaint_validation_failed");
  }

  const normalized = buildResult.value as unknown as Record<string, unknown>;

  const now = deps.clock.now();
  if (!(now instanceof Date) || isNaN(now.getTime())) {
    throw new ComplaintsInternalError("invalid_clock_time");
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const yearStr = parts.find(p => p.type === "year")?.value;
  const monthStr = parts.find(p => p.type === "month")?.value;
  const dayStr = parts.find(p => p.type === "day")?.value;

  if (!yearStr || !monthStr || !dayStr) {
    throw new ComplaintsInternalError("failed_to_format_lima_date");
  }

  const limaDateStr = `${yearStr}-${monthStr}-${dayStr}`;
  const sheetYear = parseInt(yearStr, 10);

  const deadlineAt = calculatePreliminaryComplaintDeadline({
    submittedAt: limaDateStr,
    businessDays: 15,
    timeZone: "America/Lima",
    holidays: Array.from(deps.holidays),
  });

  const privateToken = createComplaintPrivateToken(deps.randomBytes);

  const tokenDigest = deriveComplaintAccessTokenDigest({
    token: privateToken,
    secret: deps.tokenSecret.secret,
    keyVersion: deps.tokenSecret.version,
  });

  const idempotencyDigest = deriveComplaintIdempotencyDigest({
    idempotencyKey: idempotencyKey,
    secret: deps.idempotencySecret.secret,
    keyVersion: deps.idempotencySecret.version,
  });

  const snapshot = createComplaintPayloadSnapshot(normalized);
  const hashResult = hashCanonicalJson(snapshot);

  const repoResult = await deps.repository.createComplaint({
    payloadSnapshot: snapshot,
    payloadHash: hashResult.sha256,
    privateTokenHash: tokenDigest.digest,
    tokenHashKeyVersion: tokenDigest.keyVersion,
    idempotencyKeyHash: idempotencyDigest.digest,
    idempotencyHashKeyVersion: idempotencyDigest.keyVersion,
    sheetYear,
    submittedAt: now,
    deadlineAt,
  });

  if (repoResult.kind === "already_exists") {
    return {
      kind: "already_exists",
      complaintId: repoResult.complaintId,
      sheetNumber: repoResult.sheetNumber,
      status: repoResult.status,
      submittedAt: repoResult.submittedAt,
      deadlineAt: repoResult.deadlineAt,
    };
  }

  return {
    kind: "created",
    complaintId: repoResult.complaintId,
    sheetNumber: repoResult.sheetNumber,
    status: repoResult.status,
    submittedAt: repoResult.submittedAt,
    deadlineAt: repoResult.deadlineAt,
    privateToken,
  };
}
