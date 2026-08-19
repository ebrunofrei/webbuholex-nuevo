import { canonicalizeJson as coreCanonicalizeJson, CanonicalJsonError } from "@/lib/core/canonical-json";

export type CanonicalJsonPrimitive =
  | null
  | boolean
  | string
  | number;

export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

export function canonicalizeJson(value: unknown): string {
  try {
    return coreCanonicalizeJson(value);
  } catch (error) {
    if (error instanceof CanonicalJsonError) {
      throw new Error("complaint_canonical_payload_invalid");
    }
    throw error;
  }
}
