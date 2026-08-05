import type { LegalService, ProductCategory } from "@/types/domain";

export const legalServices: readonly LegalService[] = [
  {
    id: "orientacion-inicial",
    slug: "orientacion-inicial",
    name: "Orientación legal inicial",
    summary: "Ordenamos los hechos, la materia y los próximos pasos posibles antes de una evaluación profesional.",
    engagement: "orientacion",
    status: "preparation",
  },
  {
    id: "revision-documental",
    slug: "revision-documental",
    name: "Revisión y personalización",
    summary: "Revisión profesional y adecuación de documentos a la situación concreta del solicitante.",
    engagement: "revision",
    status: "preparation",
  },
  {
    id: "patrocinio-defensa",
    slug: "patrocinio-defensa",
    name: "Patrocinio y defensa",
    summary: "Evaluación para determinar si el caso requiere estrategia, representación o defensa profesional.",
    engagement: "defensa",
    status: "preparation",
  },
] as const;

export const productCategories: ReadonlyArray<{ category: ProductCategory; title: string; description: string }> = [
  { category: "legal", title: "Legales", description: "Documentos jurídicos sujetos a revisión editorial y control de versión." },
  { category: "empresarial", title: "Empresariales", description: "Soluciones documentales para la operación y organización de empresas." },
  { category: "contable", title: "Contables", description: "Formatos de apoyo administrativo y contable, con alcance claramente indicado." },
];
