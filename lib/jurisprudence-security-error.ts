import type { JurisprudenceSecurityPublicErrorCode } from "@/types/jurisprudence-security";

export class JurisprudenceSecurityError extends Error {
  readonly status: 400 | 401 | 403 | 413 | 415 | 503;
  readonly code: JurisprudenceSecurityPublicErrorCode;

  constructor(status: 400 | 401 | 403 | 413 | 415 | 503, code: JurisprudenceSecurityPublicErrorCode, message: string) {
    super(message);
    this.name = "JurisprudenceSecurityError";
    this.status = status;
    this.code = code;
  }
}
