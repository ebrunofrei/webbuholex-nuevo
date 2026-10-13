/**
 * Hermes Control Persistence & Sanitized Errors
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

/**
 * Sanitized repository error representing unavailable persistence or database failures.
 * Never exposes raw PostgreSQL error text, schema names, credentials, or SQL text.
 */
export class HermesControlPersistenceError extends Error {
  readonly code = "usage_control_unavailable";

  constructor(message: string = "usage_control_unavailable") {
    super(message);
    this.name = "HermesControlPersistenceError";
  }
}
