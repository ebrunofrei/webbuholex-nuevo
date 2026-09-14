export class PaymentAttemptConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentAttemptConflictError";
  }
}

export class PaymentAttemptCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentAttemptCreationError";
  }
}

export class PaymentAttemptProviderPaymentIdConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentAttemptProviderPaymentIdConflictError";
  }
}

export class PaymentAttemptStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentAttemptStateTransitionError";
  }
}

export class PaymentProviderEventStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderEventStateTransitionError";
  }
}
