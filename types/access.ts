export type AccessLevelId = "public" | "future_account" | "future_premium";

export interface AccessBoundary {
  id: AccessLevelId;
  label: string;
  loginRequired: boolean;
  paymentRequired: boolean;
  status: "available" | "planned";
  capabilities: readonly string[];
}

export type CookieCategoryId = "necessary" | "analytics" | "personalization" | "advertising";

export interface CookieCategory {
  id: CookieCategoryId;
  enabled: boolean;
  requiresConsent: boolean;
  description: string;
}

export type FutureAnalyticsEventName =
  | "portal_public_enter"
  | "portal_intelligent_enter"
  | "legal_panel_open"
  | "legal_policy_open"
  | "public_resource_open"
  | "jurisprudence_open"
  | "manual_open"
  | "product_view"
  | "service_view"
  | "assistant_cta_open"
  | "signup_start"
  | "login_start"
  | "premium_feature_intent"
  | "jurisprudence_search"
  | "jurisprudence_result_open"
  | "official_source_open"
  | "jurisprudence_filter_apply"
  | "jurisprudence_assistant_intent"
  | "quick_read_intent"
  | "compare_intent"
  | "applicability_intent"
  | "signup_from_jurisprudence"
  | "premium_analysis_intent";

export interface FutureAnalyticsEvent {
  name: FutureAnalyticsEventName;
  status: "modeled_only";
  sendsToThirdParties: false;
  permitsLegalQueryContent: false;
  purpose: string;
}
