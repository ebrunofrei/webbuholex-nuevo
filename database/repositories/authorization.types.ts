export type ExternalIdentityProvider = "auth0";

export type OperatorStatus = "active" | "suspended";

export type AdminCapability = "complaints:respond" | "complaints:read";

export type AuthorizationRepositoryResult =
  | { kind: "authorized"; operatorId: string }
  | { kind: "operator_not_mapped" }
  | { kind: "operator_inactive" }
  | { kind: "capability_missing" };
