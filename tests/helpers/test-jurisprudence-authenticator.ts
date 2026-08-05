import type {
  JurisprudenceAuthenticationResult,
  JurisprudenceAuthenticator,
} from "@/types/jurisprudence-security";

export class TestJurisprudenceAuthenticator implements JurisprudenceAuthenticator {
  readonly #result: JurisprudenceAuthenticationResult;
  calls = 0;

  constructor(result: JurisprudenceAuthenticationResult) {
    this.#result = structuredClone(result);
  }

  async authenticate(): Promise<JurisprudenceAuthenticationResult> {
    this.calls += 1;
    return structuredClone(this.#result);
  }
}
