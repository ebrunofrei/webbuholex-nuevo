import { z } from "zod";

export const authenticationProviderAuthorizationBlockerSchema = z.enum([
  "institutional_authorization_missing",
  "provider_owner_missing",
  "contract_and_cost_review_missing",
  "privacy_review_missing",
  "dependency_change_not_approved",
  "react_upgrade_not_approved",
  "react_dom_upgrade_not_approved",
  "dependency_graph_not_reviewed",
  "secret_manager_missing",
  "production_session_store_missing",
  "deployment_domain_missing",
]);

export const authenticationProviderAuthorizationConditionSchema = z.enum([
  "institutional_owner_defined",
  "contract_and_cost_reviewed",
  "privacy_review_completed",
  "dependency_change_approved",
  "react_upgrade_approved",
  "react_dom_upgrade_approved",
  "dependency_graph_reviewed",
  "secret_manager_defined",
  "production_session_store_defined",
  "deployment_domain_defined",
]);

export const authenticationProviderAuthorizationInputSchema = z.object({
  institutionalAuthorizationGranted: z.boolean(),
  providerSelected: z.boolean(),
  providerApproved: z.boolean(),
  institutionalOwnerDefined: z.boolean(),
  contractAndCostReviewed: z.boolean(),
  privacyReviewCompleted: z.boolean(),
  dependencyChangeApproved: z.boolean(),
  reactUpgradeApproved: z.boolean(),
  reactDomUpgradeApproved: z.boolean(),
  dependencyGraphReviewed: z.boolean(),
  secretManagerDefined: z.boolean(),
  productionSessionStoreDefined: z.boolean(),
  deploymentDomainDefined: z.boolean(),
  rejectionReasons: z.array(z.string().trim().min(1).max(500)).max(20),
}).strict();

export const authenticationProviderAuthorizationDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("authorize"),
    provider: z.literal("Auth0"),
    package: z.literal("@auth0/nextjs-auth0"),
    version: z.literal("4.26.0"),
    reactTarget: z.string().trim().min(1),
    reactDomTarget: z.string().trim().min(1),
    conditions: z.array(authenticationProviderAuthorizationConditionSchema).min(10).max(10),
  }).strict().superRefine((decision, context) => {
    if (new Set(decision.conditions).size !== 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conditions"],
        message: "La autorización requiere todas las condiciones sin duplicados.",
      });
    }
  }),
  z.object({
    decision: z.literal("reject"),
    reasons: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
    safeState: z.literal("not_configured"),
  }).strict(),
  z.object({
    decision: z.literal("defer"),
    blockers: z.array(authenticationProviderAuthorizationBlockerSchema).min(1),
    safeState: z.literal("not_configured"),
  }).strict(),
]);
