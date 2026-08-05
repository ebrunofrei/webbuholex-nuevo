import type { ProductCategory } from "@/types/catalog";

export interface HomeTemplateSuggestion {
  id: string;
  code: string;
  title: string;
  matter: string;
  jurisdiction: string;
  version: string;
  href: string;
  availabilityLabel: string;
}

export interface HomeCategory {
  category: ProductCategory;
  title: string;
  description: string;
  href: string;
  productCount: number;
  statusLabel: string;
}

export interface HomeViewModel {
  products: readonly HomeTemplateSuggestion[];
  categories: readonly HomeCategory[];
  realProductCount: number;
}

export type HomeSceneVisual = "owl" | "documents" | "product" | "professional";

export interface HomeHeroScene {
  id: string;
  number: string;
  label: string;
  title: string;
  description: string;
  action: string;
  href: string;
  visual: HomeSceneVisual;
  status: string | null;
}
