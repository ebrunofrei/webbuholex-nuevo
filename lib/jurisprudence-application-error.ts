import { JurisprudenceRepositoryError } from "@/lib/jurisprudence-repository-error";
import type {
  JurisprudenceApplicationErrorCode,
  JurisprudenceApplicationErrorDetails,
} from "@/types/jurisprudence-application";
import { ZodError } from "zod";

export class JurisprudenceApplicationError extends Error {
  readonly code: JurisprudenceApplicationErrorCode;
  readonly details: JurisprudenceApplicationErrorDetails;

  constructor(
    code: JurisprudenceApplicationErrorCode,
    message: string,
    details: JurisprudenceApplicationErrorDetails = {},
  ) {
    super(message);
    this.name = "JurisprudenceApplicationError";
    this.code = code;
    this.details = details;
  }
}

const repositoryCodeMap: Readonly<Record<JurisprudenceRepositoryError["code"], JurisprudenceApplicationErrorCode>> = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_CONFLICT: "DUPLICATE_CONFLICT",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  NOT_FOUND: "NOT_FOUND",
  PERSISTENCE_ERROR: "REPOSITORY_UNAVAILABLE",
  RESOURCE_CLOSED: "RESOURCE_CLOSED",
};

export function toJurisprudenceApplicationError(
  error: unknown,
  requestId?: string,
): JurisprudenceApplicationError {
  if (error instanceof JurisprudenceApplicationError) return error;
  if (error instanceof ZodError) {
    return new JurisprudenceApplicationError(
      "VALIDATION_ERROR",
      "La operación no cumple el contrato de la aplicación jurisprudencial.",
      requestId === undefined ? {} : { requestId },
    );
  }
  if (error instanceof JurisprudenceRepositoryError) {
    const details: JurisprudenceApplicationErrorDetails = {
      ...(requestId === undefined ? {} : { requestId }),
      ...(error.details.recordId === undefined ? {} : { recordId: error.details.recordId }),
      ...(error.details.expectedVersion === undefined ? {} : { expectedVersion: error.details.expectedVersion }),
      ...(error.details.actualVersion === undefined ? {} : { actualVersion: error.details.actualVersion }),
    };
    const code = repositoryCodeMap[error.code];
    const safeMessage = code === "REPOSITORY_UNAVAILABLE"
      ? "El repositorio jurisprudencial no está disponible."
      : `La operación jurisprudencial terminó con el código ${code}.`;
    return new JurisprudenceApplicationError(code, safeMessage, details);
  }
  return new JurisprudenceApplicationError(
    "INTERNAL_ERROR",
    "No fue posible completar la operación jurisprudencial.",
    requestId === undefined ? {} : { requestId },
  );
}
