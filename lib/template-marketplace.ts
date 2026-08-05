import { getPackageDocuments } from "@/lib/product-package-integrity";
import type { TemplateProduct } from "@/types/catalog";
import type { ProductPackage } from "@/types/product-package";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";

const categoryLabels = {
  legal: "Legales",
  empresarial: "Empresariales",
  contable: "Contables",
} as const;

const contractNames: Readonly<Record<string, string>> = {
  "01-Contrato-Arrendamiento-Vivienda-Ordinario.docx": "Contrato de Arrendamiento de Vivienda — Versión Ordinaria",
  "02-Contrato-Arrendamiento-Vivienda-Allanamiento-Futuro.docx": "Contrato de Arrendamiento de Vivienda — Allanamiento Futuro",
  "03-Contrato-Arrendamiento-Vivienda-Ley-30933.docx": "Contrato de Arrendamiento de Vivienda — Ley N.° 30933",
};

const annexNames: Readonly<Record<string, string>> = {
  "01-Anexo-Acta-de-Entrega-e-Inventario.docx": "Acta de Entrega e Inventario",
  "02-Anexo-Acta-de-Devolucion-del-Inmueble.docx": "Acta de Devolución del Inmueble",
  "03-Anexo-Registro-Fotografico-Inicial.docx": "Registro Fotográfico Inicial",
  "04-Anexo-Constancia-Reglamento-Interno.docx": "Constancia de Entrega y Recepción del Reglamento Interno",
  "05-Anexo-Relacion-de-Ocupantes-Autorizados.docx": "Relación de Ocupantes Autorizados",
  "06-Anexo-Autorizacion-y-Condiciones-para-Mascotas.docx": "Autorización y Condiciones para Mascotas",
  "07-Anexo-Autorizacion-de-Mejoras-Instalaciones-o-Modificaciones.docx": "Autorización de Mejoras, Instalaciones o Modificaciones",
  "08-Anexo-Cronograma-y-Constancia-del-Primer-Pago.docx": "Cronograma y Constancia del Primer Pago",
};

const auxiliaryNames = [
  "Guía de Uso y Personalización",
  "Checklist Previo a la Firma",
  "Licencia de Uso",
  "Documento Léeme",
] as const;

export function buildTemplateMarketplaceProduct(product: TemplateProduct, productPackage: ProductPackage): TemplateMarketplaceProduct {
  const documents = getPackageDocuments(productPackage);
  const customerDocuments = documents.filter((document) => document.audience === "customer");
  const contracts = product.commercialFiles.map((file) => contractNames[file.fileName]).filter((name): name is string => Boolean(name));
  const annexes = product.annexFiles.map((file) => annexNames[file.fileName]).filter((name): name is string => Boolean(name));

  return {
    id: product.id,
    code: product.code,
    slug: product.slug,
    href: `/plantillas/legales/${product.slug}/`,
    commercialTitle: product.commercialTitle,
    category: product.category,
    categoryLabel: categoryLabels[product.category],
    matter: product.matter,
    jurisdiction: product.jurisdiction,
    documentType: product.documentType,
    deliveryFormatLabel: "Word editable y documentos PDF",
    version: product.version,
    reviewedAt: product.reviewedAt,
    nextReviewAt: product.nextReviewAt,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    publicAudience: product.publicAudience,
    scope: product.scope,
    useCases: product.useCases,
    exclusions: product.exclusions,
    warnings: product.warnings,
    formalRequirements: product.formalRequirements,
    institutionalAuthor: product.intellectualProperty.institutionalAuthor,
    coauthor: product.intellectualProperty.coauthor,
    availabilityStatus: product.availabilityStatus,
    availabilityLabel: product.availabilityStatus === "editorial_preview" ? "Vista previa editorial" : product.availabilityStatus === "available" ? "Disponible" : "Retirada",
    contractVersions: product.contractVersions,
    contracts,
    annexes,
    auxiliaryDocuments: auxiliaryNames,
    frequentlyAskedQuestions: product.frequentlyAskedQuestions,
    packageCounts: {
      contracts: documents.filter((document) => document.audience === "customer" && document.purpose === "contract").length,
      annexes: documents.filter((document) => document.audience === "customer" && document.purpose === "annex").length,
      auxiliary: customerDocuments.filter((document) => ["guide", "checklist", "license", "readme"].includes(document.purpose)).length,
      customerDocuments: customerDocuments.length,
    },
  };
}

export function isMarketplaceViewModelSafe(product: TemplateMarketplaceProduct): boolean {
  const serialized = JSON.stringify(product);
  return !serialized.includes("product-assets/")
    && !serialized.includes("legal/intellectual-property/")
    && !serialized.includes("sha256")
    && !serialized.includes("privateFileRef")
    && !serialized.includes("masterInternalFile")
    && !serialized.includes("CONTRATO-CESION-DERECHOS");
}
