import type { EditorialStatus } from "@/types/catalog";

export const editorialStatusLabels: Readonly<Record<EditorialStatus, string>> = {
  inventoried: "Inventariada",
  anonymized: "Anonimizada",
  legal_review: "Revisión jurídica",
  regulatory_review: "Revisión de vigencia normativa",
  commercial_preparation: "Preparación comercial",
  approved: "Aprobada",
  published: "Publicada",
  updated: "Actualizada",
  withdrawn: "Retirada",
};

export const editorialTransitions: Readonly<Record<EditorialStatus, readonly EditorialStatus[]>> = {
  inventoried: ["anonymized"],
  anonymized: ["legal_review"],
  legal_review: ["regulatory_review"],
  regulatory_review: ["commercial_preparation"],
  commercial_preparation: ["approved"],
  approved: ["published"],
  published: ["updated", "withdrawn"],
  updated: ["published", "withdrawn"],
  withdrawn: [],
};

export const editorialWorkflow: readonly EditorialStatus[] = [
  "inventoried",
  "anonymized",
  "legal_review",
  "regulatory_review",
  "commercial_preparation",
  "approved",
  "published",
] as const;
