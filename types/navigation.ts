export type NavigationAccessLevel = "public" | "anonymous_only" | "authenticated" | "premium";
export type NavigationVisibility = "visible" | "reserved" | "hidden";
export type NavigationIcon = "home" | "assistant" | "projects" | "jurisprudence" | "documents" | "automation" | "library" | "products" | "services" | "account" | "login" | "explore" | "legislation" | "manuals" | "templates" | "tools" | "contact";

export interface NavigationItem {
  id: string;
  label: string;
  href: `/${string}`;
  accessLevel: NavigationAccessLevel;
  visibility: NavigationVisibility;
  icon?: NavigationIcon;
  activeMatch: "exact" | "prefix";
  requiredCapability?: import("@/database/repositories/authorization.types").AdminCapability;
}
