import { JurisprudenceApplicationError, toJurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import type { JurisprudenceHttpPublicErrorCode } from "@/types/jurisprudence-http";

export class JurisprudenceHttpError extends Error {
  readonly status: number;
  readonly code: JurisprudenceHttpPublicErrorCode;
  readonly headers: Readonly<Record<string, string>>;

  constructor(
    status: number,
    code: JurisprudenceHttpPublicErrorCode,
    message: string,
    headers: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "JurisprudenceHttpError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export interface JurisprudenceHttpErrorMapping {
  status: number;
  code: JurisprudenceHttpPublicErrorCode;
  message: string;
  headers: Readonly<Record<string, string>>;
}

const applicationStatusMap: Readonly<Record<JurisprudenceApplicationError["code"], JurisprudenceHttpErrorMapping>> = {
  VALIDATION_ERROR: { status: 400, code: "BAD_REQUEST", message: "La solicitud no cumple el contrato requerido.", headers: {} },
  NOT_FOUND: { status: 404, code: "NOT_FOUND", message: "No se encontró el recurso solicitado.", headers: {} },
  NOT_PUBLIC: { status: 404, code: "NOT_FOUND", message: "No se encontró el recurso solicitado.", headers: {} },
  DUPLICATE_CONFLICT: { status: 409, code: "DUPLICATE_CONFLICT", message: "La solicitud entra en conflicto con un registro existente.", headers: {} },
  IDEMPOTENCY_CONFLICT: { status: 409, code: "IDEMPOTENCY_CONFLICT", message: "La clave de idempotencia ya fue utilizada con otro contenido.", headers: {} },
  VERSION_CONFLICT: { status: 409, code: "VERSION_CONFLICT", message: "La versión indicada ya no es vigente.", headers: {} },
  PUBLICATION_BLOCKED: { status: 422, code: "PUBLICATION_BLOCKED", message: "El registro no cumple las reglas de publicación.", headers: {} },
  REPOSITORY_UNAVAILABLE: { status: 503, code: "SERVICE_UNAVAILABLE", message: "El servicio jurisprudencial no está disponible.", headers: {} },
  RESOURCE_CLOSED: { status: 503, code: "SERVICE_UNAVAILABLE", message: "El servicio jurisprudencial no está disponible.", headers: {} },
  INTERNAL_ERROR: { status: 500, code: "INTERNAL_ERROR", message: "No fue posible completar la solicitud.", headers: {} },
};

export function mapJurisprudenceApplicationErrorToHttp(error: unknown): JurisprudenceHttpErrorMapping {
  if (error instanceof JurisprudenceHttpError) {
    return { status: error.status, code: error.code, message: error.message, headers: error.headers };
  }
  const applicationError = error instanceof JurisprudenceApplicationError
    ? error
    : toJurisprudenceApplicationError(error);
  return applicationStatusMap[applicationError.code];
}
