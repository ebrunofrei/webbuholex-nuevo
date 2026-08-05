import { z } from "zod";
import { authenticationProviderKindSchema } from "@/lib/schemas/authentication-configuration";

const opaqueReferenceSchema = z.string().min(8).max(200).regex(/^[A-Za-z0-9._:-]+$/);

export const externalIdentityResolutionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("anonymous") }).strict(),
  z.object({
    status: z.literal("rejected"),
    reason: z.enum(["invalid_credentials", "invalid_claims", "expired", "revoked"]),
  }).strict(),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum(["not_configured", "infrastructure_error"]),
  }).strict(),
  z.object({
    status: z.literal("verified"),
    providerKind: authenticationProviderKindSchema,
    subjectId: opaqueReferenceSchema,
    sessionReference: opaqueReferenceSchema,
    issuer: z.string().url().max(500),
    audiences: z.array(z.string().trim().min(3).max(500)).min(1).max(10),
    issuedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    authenticationLevel: z.enum(["authenticated", "strong_authenticated"]),
    roleAssignmentVersion: z.number().int().positive(),
    signatureVerified: z.literal(true),
    claimsValidated: z.literal(true),
  }).strict(),
]);
