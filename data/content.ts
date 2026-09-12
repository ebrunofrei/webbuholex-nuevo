import type { ProductCategory } from "@/types/domain";

export const productCategories: ReadonlyArray<{
  category: ProductCategory;
  title: string;
  description: string;
}> = [
  {
    category: "legal",
    title: "Legales",
    description:
      "Documentos jurídicos sujetos a revisión editorial y control de versión.",
  },
  {
    category: "empresarial",
    title: "Empresariales",
    description:
      "Soluciones documentales para la operación y organización de empresas.",
  },
  {
    category: "contable",
    title: "Contables",
    description:
      "Formatos de apoyo administrativo y contable, con alcance claramente indicado.",
  },
];