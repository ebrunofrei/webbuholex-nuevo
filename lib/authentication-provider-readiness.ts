import { evaluateAuthenticationProviderAuthorization } from "@/lib/authentication-provider-authorization";
import type {
  AuthenticationProviderAuthorizationInput,
  AuthenticationProviderImplementationReadiness,
} from "@/types/authentication-provider-authorization";

export function evaluateAuthenticationProviderImplementationReadiness(
  input: AuthenticationProviderAuthorizationInput,
): AuthenticationProviderImplementationReadiness {
  const decision = evaluateAuthenticationProviderAuthorization(input);
  const blockers = decision.decision === "defer" ? decision.blockers : Object.freeze([]);

  return Object.freeze({
    phase: "11.F.2",
    architectureValidated: true,
    providerRecommendationRecorded: true,
    providerSelected: input.providerSelected,
    providerApproved: input.providerApproved,
    dependencyChangeRequired: true,
    dependencyChangeApproved: input.dependencyChangeApproved,
    reactUpgradeRequired: true,
    reactUpgradeApproved: input.reactUpgradeApproved,
    reactUpgradeExecuted: false,
    reactDomUpgradeRequired: true,
    reactDomUpgradeApproved: input.reactDomUpgradeApproved,
    reactDomUpgradeExecuted: false,
    dependencyGraphReviewed: input.dependencyGraphReviewed,
    institutionalOwnerDefined: input.institutionalOwnerDefined,
    contractAndCostReviewed: input.contractAndCostReviewed,
    privacyReviewCompleted: input.privacyReviewCompleted,
    secretManagerDefined: input.secretManagerDefined,
    productionSessionStoreDefined: input.productionSessionStoreDefined,
    deploymentDomainDefined: input.deploymentDomainDefined,
    authenticationReal: false,
    endpointsMounted: false,
    readyForProviderImplementation: decision.decision === "authorize",
    readyForRouteMount: false,
    overrideSupported: false,
    blockers,
  });
}
