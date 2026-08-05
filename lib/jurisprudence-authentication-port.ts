import { jurisprudencePrincipalSchema } from "@/lib/schemas/jurisprudence-security";
import type {
  JurisprudenceAuthenticationResult,
  JurisprudenceAuthenticator,
  JurisprudencePrincipal,
} from "@/types/jurisprudence-security";

function immutablePrincipal(principal: JurisprudencePrincipal): JurisprudencePrincipal {
  return Object.freeze({ ...principal, roles: Object.freeze([...principal.roles]) });
}

export class AnonymousJurisprudenceAuthenticator implements JurisprudenceAuthenticator {
  readonly #now: () => string;

  constructor(now: () => string = () => new Date().toISOString()) {
    this.#now = now;
  }

  async authenticate(): Promise<JurisprudenceAuthenticationResult> {
    const parsed = jurisprudencePrincipalSchema.parse({
      kind: "anonymous",
      subjectId: null,
      roles: [],
      authenticationLevel: "anonymous",
      issuedAt: new Date(this.#now()).toISOString(),
    });
    const principal: JurisprudencePrincipal = {
      kind: parsed.kind,
      subjectId: parsed.subjectId,
      roles: parsed.roles,
      authenticationLevel: parsed.authenticationLevel,
      issuedAt: parsed.issuedAt,
    };
    return { status: "anonymous", principal: immutablePrincipal(principal) };
  }
}
