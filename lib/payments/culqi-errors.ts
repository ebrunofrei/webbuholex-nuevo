export class CulqiError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "CulqiError";
  }
}

export class CulqiAuthenticationError extends CulqiError {
  constructor(message: string = "Authentication failed with Culqi API") {
    super(message);
    this.name = "CulqiAuthenticationError";
  }
}

export class CulqiValidationError extends CulqiError {
  constructor(message: string = "Validation failed", code?: string) {
    super(message, code);
    this.name = "CulqiValidationError";
  }
}

export class CulqiDeclineError extends CulqiError {
  constructor(
    message: string = "Payment declined by provider",
    code?: string,
    public readonly declineCode?: string,
    public readonly providerPaymentId?: string
  ) {
    super(message, code);
    this.name = "CulqiDeclineError";
  }
}

export class CulqiRateLimitError extends CulqiError {
  constructor(message: string = "Rate limit exceeded on Culqi API") {
    super(message);
    this.name = "CulqiRateLimitError";
  }
}

export class CulqiUnavailableError extends CulqiError {
  constructor(message: string = "Culqi API is unavailable") {
    super(message);
    this.name = "CulqiUnavailableError";
  }
}

export class CulqiNetworkError extends CulqiError {
  constructor(message: string = "Network error occurred") {
    super(message);
    this.name = "CulqiNetworkError";
  }
}

export class CulqiTimeoutError extends CulqiError {
  constructor(message: string = "Request to Culqi API timed out") {
    super(message);
    this.name = "CulqiTimeoutError";
  }
}

export class CulqiMalformedResponseError extends CulqiError {
  constructor(message: string = "Invalid response from provider") {
    super(message);
    this.name = "CulqiMalformedResponseError";
  }
}

export class CulqiReconciliationError extends CulqiError {
  constructor(
    message: string = "Ambiguous provider outcome",
    public readonly providerPaymentId?: string
  ) {
    super(message);
    this.name = "CulqiReconciliationError";
  }
}
