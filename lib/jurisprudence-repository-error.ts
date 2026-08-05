import type { JurisprudenceRepositoryErrorCode, JurisprudenceRepositoryErrorDetails } from "@/types/jurisprudence-repository";
import { ZodError } from "zod";

export class JurisprudenceRepositoryError extends Error {
  readonly code: JurisprudenceRepositoryErrorCode;
  readonly details: JurisprudenceRepositoryErrorDetails;

  constructor(code: JurisprudenceRepositoryErrorCode, message: string, details: JurisprudenceRepositoryErrorDetails = {}) {
    super(message);
    this.name = "JurisprudenceRepositoryError";
    this.code = code;
    this.details = details;
  }
}

export function toJurisprudencePersistenceError(error: unknown): JurisprudenceRepositoryError {
  if (error instanceof JurisprudenceRepositoryError) return error;
  if (error instanceof ZodError) return new JurisprudenceRepositoryError("VALIDATION_ERROR", "La operación no cumple el contrato del repositorio.", { cause: error.message });
  return new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "No fue posible completar la operación de persistencia jurisprudencial.", {
    cause: error instanceof Error ? error.message : "Unknown persistence failure",
  });
}
