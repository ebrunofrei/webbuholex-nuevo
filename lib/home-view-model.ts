import { productCategories } from "@/data/content";
import type { HomeHeroScene, HomeViewModel } from "@/types/home";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";

const categoryRoutes = {
  legal: "/plantillas/legales/",
  empresarial: "/plantillas/empresariales/",
  contable: "/plantillas/contables/",
} as const;

export function buildHomeViewModel(products: readonly TemplateMarketplaceProduct[]): HomeViewModel {
  const suggestions = products.map((product) => ({
    id: product.id,
    code: product.code,
    title: product.commercialTitle,
    matter: product.matter,
    jurisdiction: product.jurisdiction,
    version: product.version,
    href: product.href,
    availabilityLabel: product.availabilityLabel,
  }));

  return {
    products: suggestions,
    realProductCount: suggestions.length,
    categories: productCategories.map((category) => {
      const productCount = products.filter((product) => product.category === category.category).length;
      return {
        ...category,
        href: categoryRoutes[category.category],
        productCount,
        statusLabel: productCount === 0 ? "En preparación" : `${productCount} producto real`,
      };
    }),
  };
}

export function isHomeViewModelSafe(viewModel: HomeViewModel): boolean {
  const serialized = JSON.stringify(viewModel);
  return !/product-assets|sha256|privateFileRef|CONTRATO-CESION|legal\/intellectual-property/i.test(serialized);
}

export function buildHomeHeroScenes(product: TemplateMarketplaceProduct | undefined): readonly HomeHeroScene[] {
  return [
    {
      id: "orientation",
      number: "01",
      label: "ORIENTACIÓN JURÍDICA",
      title: "Ordene su problema antes de actuar",
      description: "Identifique materia, jurisdicción y urgencia antes de decidir el siguiente paso.",
      action: "Consultar al Asistente Legal",
      href: "/asistente/",
      visual: "owl",
      status: null,
    },
    {
      id: "templates",
      number: "02",
      label: "DOCUMENTOS JURÍDICOS",
      title: "Contratos con contexto, versión y control",
      description: "Explore plantillas preparadas para el ordenamiento jurídico peruano.",
      action: "Explorar plantillas",
      href: "/plantillas/",
      visual: "documents",
      status: null,
    },
    {
      id: "featured-product",
      number: "03",
      label: "PRODUCTO EN VISTA PREVIA",
      title: product?.commercialTitle ?? "Contrato de Arrendamiento de Vivienda",
      description: product
        ? `${product.packageCounts.contracts} versiones contractuales, ${product.packageCounts.annexes} anexos y documentos auxiliares.`
        : "Tres versiones contractuales, ocho anexos y documentos auxiliares.",
      action: "Ver el producto",
      href: product?.href ?? "/plantillas/legales/contrato-arrendamiento-vivienda/",
      visual: "product",
      status: "Próximamente disponible",
    },
    {
      id: "professional",
      number: "04",
      label: "DEFENSA Y ESTRATEGIA",
      title: "Cuando el caso exige intervención profesional",
      description: "Solicite evaluación cuando la situación requiera análisis, representación o defensa.",
      action: "Solicitar atención",
      href: "/consulta-profesional/",
      visual: "professional",
      status: null,
    },
  ];
}
