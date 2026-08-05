export type AuthenticationProviderAuthorizationBlocker =
  | "institutional_authorization_missing"
  | "provider_owner_missing"
  | "contract_and_cost_review_missing"
  | "privacy_review_missing"
  | "dependency_change_not_approved"
  | "react_upgrade_not_approved"
  | "react_dom_upgrade_not_approved"
  | "dependency_graph_not_reviewed"
  | "secret_manager_missing"
  | "production_session_store_missing"
  | "deployment_domain_missing";

export type AuthenticationProviderAuthorizationCondition =
  | "institutional_owner_defined"
  | "contract_and_cost_reviewed"
  | "privacy_review_completed"
  | "dependency_change_approved"
  | "react_upgrade_approved"
  | "react_dom_upgrade_approved"
  | "dependency_graph_reviewed"
  | "secret_manager_defined"
  | "production_session_store_defined"
  | "deployment_domain_defined";

export type AuthenticationProviderAuthorizationDecision =
  | {
      readonly decision: "authorize";
      readonly provider: "Auth0";
      readonly package: "@auth0/nextjs-auth0";
      readonly version: "4.26.0";
      readonly reactTarget: string;
      readonly reactDomTarget: string;
      readonly conditions: readonly AuthenticationProviderAuthorizationCondition[];
    }
  | {
      readonly decision: "reject";
      readonly reasons: readonly string[];
      readonly safeState: "not_configured";
    }
  | {
      readonly decision: "defer";
      readonly blockers: readonly AuthenticationProviderAuthorizationBlocker[];
      readonly safeState: "not_configured";
    };

export interface AuthenticationProviderAuthorizationInput {
  readonly institutionalAuthorizationGranted: boolean;
  readonly providerSelected: boolean;
  readonly providerApproved: boolean;
  readonly institutionalOwnerDefined: boolean;
  readonly contractAndCostReviewed: boolean;
  readonly privacyReviewCompleted: boolean;
  readonly dependencyChangeApproved: boolean;
  readonly reactUpgradeApproved: boolean;
  readonly reactDomUpgradeApproved: boolean;
  readonly dependencyGraphReviewed: boolean;
  readonly secretManagerDefined: boolean;
  readonly productionSessionStoreDefined: boolean;
  readonly deploymentDomainDefined: boolean;
  readonly rejectionReasons: readonly string[];
}

export interface AuthenticationProviderImplementationReadiness {
  readonly phase: "11.F.2";
  readonly architectureValidated: true;
  readonly providerRecommendationRecorded: true;
  readonly providerSelected: boolean;
  readonly providerApproved: boolean;
  readonly dependencyChangeRequired: true;
  readonly dependencyChangeApproved: boolean;
  readonly reactUpgradeRequired: true;
  readonly reactUpgradeApproved: boolean;
  readonly reactUpgradeExecuted: false;
  readonly reactDomUpgradeRequired: true;
  readonly reactDomUpgradeApproved: boolean;
  readonly reactDomUpgradeExecuted: false;
  readonly dependencyGraphReviewed: boolean;
  readonly institutionalOwnerDefined: boolean;
  readonly contractAndCostReviewed: boolean;
  readonly privacyReviewCompleted: boolean;
  readonly secretManagerDefined: boolean;
  readonly productionSessionStoreDefined: boolean;
  readonly deploymentDomainDefined: boolean;
  readonly authenticationReal: false;
  readonly endpointsMounted: false;
  readonly readyForProviderImplementation: boolean;
  readonly readyForRouteMount: false;
  readonly overrideSupported: false;
  readonly blockers: readonly AuthenticationProviderAuthorizationBlocker[];
}

export interface AuthenticationCompatibilityAssessment {
  readonly phase: "11.F.2";
  readonly current: {
    readonly next: "15.5.9";
    readonly react: "19.1.1";
    readonly reactDom: "19.1.1";
  };
  readonly recommendedSdk: "@auth0/nextjs-auth0@4.26.0";
  readonly compatibility: {
    readonly next: "compatible";
    readonly react: "incompatible";
    readonly reactDom: "incompatible";
  };
  readonly minimumCandidateResolution: {
    readonly react: "19.1.2";
    readonly reactDom: "19.1.2";
    readonly authorized: false;
    readonly executed: false;
  };
  readonly forceInstallAllowed: false;
}
