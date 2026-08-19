export interface JurisprudencePublicationOutboxClaim {
  readonly id: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly executionId: string;
  readonly executionVersion: number;
  readonly eventType: "publish_projection" | "withdraw_projection";
  readonly payload: unknown;
  readonly status: "pending" | "processing" | "sent" | "failed" | "dead_letter";
  readonly attempts: number;
  readonly availableAt: Date;
  readonly processingStartedAt: Date | null;
}

export type ProcessNextResult = "NO_WORK" | "SENT" | "FAILED" | "DEAD_LETTER";

export interface JurisprudencePublicationOutboxProcessorRepository {
  findById(id: string): Promise<JurisprudencePublicationOutboxClaim | null>;
  claimNext(now: Date): Promise<JurisprudencePublicationOutboxClaim | null>;
  markSent(id: string, processedAt: Date): Promise<void>;
  markFailed(
    id: string,
    availableAt: Date,
    errorCode: string,
    updatedAt: Date
  ): Promise<void>;
  markDeadLetter(
    id: string,
    errorCode: string,
    processedAt: Date
  ): Promise<void>;
}
