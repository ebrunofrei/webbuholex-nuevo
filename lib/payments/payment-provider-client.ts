export interface CreateChargeCommand {
  amountMinor: number;
  currency: "PEN";
  customerEmail: string;
  sourceToken: string;
  metadataCorrelation: string;
}

export type NormalizedChargeState = "success" | "failed";

export interface NormalizedChargeResponse {
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  providerState: NormalizedChargeState;
  providerResponseCode: string | null;
}

export interface PaymentProviderClient {
  createCharge(command: CreateChargeCommand): Promise<NormalizedChargeResponse>;
  getCharge(providerPaymentId: string): Promise<NormalizedChargeResponse>;
}
