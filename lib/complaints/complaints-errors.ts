export class ComplaintsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplaintsValidationError";
  }
}

export class ComplaintsInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplaintsInternalError";
  }
}

export class ComplaintsServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplaintsServiceUnavailableError";
  }
}
