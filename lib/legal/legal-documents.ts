export type LegalDocumentId = "privacy" | "terms" | "cookies";

export interface LegalDocumentMetadata<TPath extends string = "/privacidad" | "/terminos" | "/cookies"> {
  readonly id: LegalDocumentId;
  readonly title: string;
  readonly version: "1.0";
  readonly canonicalPath: TPath;
  /**
   * ISO string de fecha de publicación efectiva.
   * DEPLOYMENT GATE: Debe permanecer null hasta el despliegue efectivo en producción.
   */
  readonly publishedAt: string | null;
  /**
   * ISO string de fecha de entrada en vigencia efectiva.
   * DEPLOYMENT GATE: Debe permanecer null hasta el despliegue efectivo en producción.
   */
  readonly effectiveAt: string | null;
}

export interface LegalDocumentsRegistry {
  readonly privacy: LegalDocumentMetadata<"/privacidad">;
  readonly terms: LegalDocumentMetadata<"/terminos">;
  readonly cookies: LegalDocumentMetadata<"/cookies">;
}

export const LEGAL_DOCUMENTS: LegalDocumentsRegistry = {
  privacy: {
    id: "privacy",
    title: "Política de Privacidad y Tratamiento de Datos Personales de BúhoLex",
    version: "1.0",
    canonicalPath: "/privacidad",
    publishedAt: null,
    effectiveAt: null,
  },
  terms: {
    id: "terms",
    title: "Términos y Condiciones de Uso de BúhoLex",
    version: "1.0",
    canonicalPath: "/terminos",
    publishedAt: null,
    effectiveAt: null,
  },
  cookies: {
    id: "cookies",
    title: "Aviso de Cookies y Tecnologías Similares de BúhoLex",
    version: "1.0",
    canonicalPath: "/cookies",
    publishedAt: null,
    effectiveAt: null,
  },
} as const;

export function getLegalDocument(id: LegalDocumentId): LegalDocumentMetadata {
  return LEGAL_DOCUMENTS[id];
}
