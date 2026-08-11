export class AuthorizationPersistenceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AuthorizationPersistenceError";
  }
}
