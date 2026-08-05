import {
  authenticationProviderAuthorizationDecisionSchema,
  authenticationProviderAuthorizationInputSchema,
} from "@/lib/schemas/authentication-provider-authorization";
import type {
  AuthenticationCompatibilityAssessment,
  AuthenticationProviderAuthorizationBlocker,
  AuthenticationProviderAuthorizationCondition,
  AuthenticationProviderAuthorizationDecision,
  AuthenticationProviderAuthorizationInput,
} from "@/types/authentication-provider-authorization";

export const AUTH0_COMPATIBILITY_ASSESSMENT: AuthenticationCompatibilityAssessment = Object.freeze({
  phase: "11.F.2",
  current: Object.freeze({ next: "15.5.9", react: "19.1.1", reactDom: "19.1.1" }),
  recommendedSdk: "@auth0/nextjs-auth0@4.26.0",
  compatibility: Object.freeze({ next: "compatible", react: "incompatible", reactDom: "incompatible" }),
  minimumCandidateResolution: Object.freeze({
    react: "19.1.2",
    reactDom: "19.1.2",
    authorized: false,
    executed: false,
  }),
  forceInstallAllowed: false,
});

const AUTHORIZATION_CONDITIONS: readonly AuthenticationProviderAuthorizationCondition[] = Object.freeze([
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

export const CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT: AuthenticationProviderAuthorizationInput = Object.freeze({
  institutionalAuthorizationGranted: false,
  providerSelected: false,
  providerApproved: false,
  institutionalOwnerDefined: false,
  contractAndCostReviewed: false,
  privacyReviewCompleted: false,
  dependencyChangeApproved: false,
  reactUpgradeApproved: false,
  reactDomUpgradeApproved: false,
  dependencyGraphReviewed: false,
  secretManagerDefined: false,
  productionSessionStoreDefined: false,
  deploymentDomainDefined: false,
  rejectionReasons: Object.freeze([]),
});

export function evaluateAuthenticationProviderAuthorization(
  rawInput: AuthenticationProviderAuthorizationInput,
): AuthenticationProviderAuthorizationDecision {
  const input = authenticationProviderAuthorizationInputSchema.parse(rawInput);

  if (input.rejectionReasons.length > 0) {
    return authenticationProviderAuthorizationDecisionSchema.parse({
      decision: "reject",
      reasons: input.rejectionReasons,
      safeState: "not_configured",
    });
  }

  const blockers: AuthenticationProviderAuthorizationBlocker[] = [];
  if (!input.institutionalAuthorizationGranted || !input.providerSelected || !input.providerApproved) {
    blockers.push("institutional_authorization_missing");
  }
  if (!input.institutionalOwnerDefined) blockers.push("provider_owner_missing");
  if (!input.contractAndCostReviewed) blockers.push("contract_and_cost_review_missing");
  if (!input.privacyReviewCompleted) blockers.push("privacy_review_missing");
  if (!input.dependencyChangeApproved) blockers.push("dependency_change_not_approved");
  if (!input.reactUpgradeApproved) blockers.push("react_upgrade_not_approved");
  if (!input.reactDomUpgradeApproved) blockers.push("react_dom_upgrade_not_approved");
  if (!input.dependencyGraphReviewed) blockers.push("dependency_graph_not_reviewed");
  if (!input.secretManagerDefined) blockers.push("secret_manager_missing");
  if (!input.productionSessionStoreDefined) blockers.push("production_session_store_missing");
  if (!input.deploymentDomainDefined) blockers.push("deployment_domain_missing");

  if (blockers.length > 0) {
    return authenticationProviderAuthorizationDecisionSchema.parse({
      decision: "defer",
      blockers,
      safeState: "not_configured",
    });
  }

  return authenticationProviderAuthorizationDecisionSchema.parse({
    decision: "authorize",
    provider: "Auth0",
    package: "@auth0/nextjs-auth0",
    version: "4.26.0",
    reactTarget: "19.1.2",
    reactDomTarget: "19.1.2",
    conditions: AUTHORIZATION_CONDITIONS,
  });
}
