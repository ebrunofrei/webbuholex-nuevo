export type ServiceAvailability =
  | "available"
  | "evaluation_required"
  | "coming_soon"
  | "suspended";

export type ServicePricingMode =
  | "fixed"
  | "from"
  | "quote_required"
  | "not_defined";

export type ServiceCategory =
  | "legal"
  | "buhodoc"
  | "thesis"
  | "accounting"
  | "government"
  | "engineering"
  | "corporate"
  | "digital";

export type ServiceProfessionalLevel =
  | "standard"
  | "professional"
  | "senior";

export interface ServiceScopeGroup {
  title: string;
  items: readonly string[];
}

export type ServiceModuleLevel =
  | "basic"
  | "optional"
  | "evaluation_required"
  | "future_integration";

export interface ServiceModuleGroup {
  title: string;
  level: ServiceModuleLevel;
  levelLabel: string;
  items: readonly string[];
}

export interface ServiceTechnicalResponsibility {
  title: string;
  description: string;
}

export interface ServiceDetailImage {
  src: string;
  alt: string;
}

/**
 * Subservicio, actuación, documento, escrito o recurso concreto
 * ofrecido dentro de una ficha principal.
 *
 * Actualmente se utiliza principalmente en BúhoDoc para describir
 * actuaciones jurídicas que requieren evaluación profesional previa.
 *
 * Contrato canónico de contenido:
 *
 * usefulWhen
 *   → situaciones en las que el servicio puede resultar útil.
 *
 * reviewBeforeAssuming
 *   → información, antecedentes y elementos que deben revisarse
 *     antes de aceptar o delimitar el encargo.
 *
 * workMayInclude
 *   → actuaciones que el trabajo profesional puede comprender.
 *
 * notice
 *   → nota estratégica destinada a explicar el criterio profesional,
 *     alcance o consideración relevante del servicio.
 */
export interface ServiceSubOffer {
  /**
   * Nombre público de la actuación o subservicio.
   *
   * Ejemplos:
   * - Demanda judicial
   * - Contestación de demanda
   * - Recurso de casación
   * - Carta notarial
   * - Contrato o adenda
   * - Informe jurídico
   */
  title: string;

  /**
   * Explicación pública breve de la actuación.
   *
   * Debe describir qué hace el servicio y su finalidad sin convertir
   * la introducción en una lista de restricciones.
   */
  description?: string;

  /**
   * Situaciones en las que el servicio puede resultar útil.
   *
   * Debe formularse desde la necesidad o contexto del cliente.
   *
   * Ejemplos:
   * - Se ha notificado una demanda.
   * - Existe una resolución adversa.
   * - La entidad ha formulado una imputación.
   *
   * No implica recomendación automática ni afirmación de viabilidad.
   */
  usefulWhen?: readonly string[];

  /**
   * Información, documentos, antecedentes o elementos que deben
   * revisarse antes de aceptar, delimitar o estructurar el encargo.
   *
   * Ejemplos:
   * - Resolución cuestionada.
   * - Fecha y forma de notificación.
   * - Plazo disponible.
   * - Competencia.
   * - Legitimidad.
   * - Documentación relevante.
   * - Medios probatorios.
   */
  reviewBeforeAssuming?: readonly string[];

  /**
   * Actuaciones que el trabajo profesional puede comprender.
   *
   * Su contenido es orientativo y no constituye un paquete
   * automáticamente incluido.
   *
   * Ejemplos:
   * - Reconstrucción cronológica.
   * - Identificación de agravios.
   * - Análisis normativo.
   * - Organización de medios probatorios.
   * - Formulación del petitorio.
   */
  workMayInclude?: readonly string[];

  /**
   * Nota estratégica específica de la actuación.
   *
   * Debe explicar un criterio profesional relevante, gestionar
   * expectativas y aportar contexto sin recurrir a formulaciones
   * innecesariamente negativas.
   *
   * Ejemplo:
   * "La evaluación previa permite identificar la estrategia procesal
   * más adecuada antes de formular la defensa."
   */
  notice?: string;

  /**
   * Forma en que se determina el precio.
   */
  pricingMode: ServicePricingMode;

  /**
   * Precio cuando el modo de contratación lo permite.
   *
   * Debe permanecer en null cuando el importe se determina
   * después de evaluar el caso.
   */
  price: number | null;

  /**
   * Moneda correspondiente al precio informado.
   *
   * Ejemplo:
   * "S/"
   */
  currency: string | null;

  /**
   * Nivel profesional requerido para la actuación.
   */
  professionalLevel?: ServiceProfessionalLevel;

  /**
   * Indica si se requiere evaluación profesional previa
   * antes de aceptar definitivamente el encargo.
   */
  requiresEvaluation: boolean;

  /**
   * Indica si el servicio admite contratación y pago inmediato.
   *
   * Normalmente será false cuando requiresEvaluation sea true.
   */
  allowsImmediatePayment: boolean;
}

export interface PublicService {
  /**
   * Identificador interno estable del servicio.
   */
  id: string;

  /**
   * Identificador público utilizado en la URL.
   */
  slug: string;

  /**
   * Nombre comercial o profesional del servicio.
   */
  title: string;

  /**
   * Categoría principal del servicio.
   */
  category: ServiceCategory;

  /**
   * Síntesis pública breve.
   */
  summary: string;

  /**
   * Explicación principal del servicio.
   */
  description: string;

  /**
   * Imagen principal utilizada en la página de detalle.
   */
  detailImage: ServiceDetailImage;

  /**
   * Alcance general resumido.
   */
  scope: readonly string[];

  /**
   * Actuaciones, prestaciones o resultados expresamente excluidos
   * del alcance general.
   */
  exclusions: readonly string[];

  /**
   * Formas posibles de prestación.
   *
   * Ejemplos:
   * - Videoconferencia
   * - Atención presencial previa coordinación
   * - Evaluación documental
   */
  modalities: readonly string[];

  /**
   * Estado comercial actual.
   */
  availability: ServiceAvailability;

  /**
   * Texto público correspondiente al estado comercial.
   */
  availabilityLabel: string;

  /**
   * Modalidad de determinación del precio.
   */
  pricingMode: ServicePricingMode;

  /**
   * Precio público cuando corresponda.
   */
  price: number | null;

  /**
   * Moneda cuando exista precio público.
   */
  currency: string | null;

  /**
   * Nivel profesional general del servicio.
   */
  professionalLevel?: ServiceProfessionalLevel;

  /**
   * Determina si debe realizarse verificación de conflicto
   * antes de aceptar el encargo.
   */
  requiresConflictCheck: boolean;

  /**
   * Determina si el servicio requiere evaluación previa.
   */
  requiresEvaluation: boolean;

  /**
   * Determina si puede contratarse y pagarse inmediatamente.
   */
  allowsImmediatePayment: boolean;

  /**
   * Responsable público del servicio.
   *
   * Actualmente permanece deliberadamente en null.
   */
  responsible: null;

  /**
   * Texto principal del CTA.
   */
  ctaLabel: string;

  /**
   * Estado editorial o comercial de la ficha.
   */
  status: "active" | "preparation";

  /**
   * Advertencia general del servicio.
   */
  warning: string | null;

  /**
   * Publicación comercial todavía no habilitada
   * mediante este contrato.
   */
  published?: false;

  /**
   * Frase breve de posicionamiento situada cerca del título.
   */
  publicTagline?: string;

  /**
   * Público al que se dirige principalmente el servicio.
   */
  targetAudience?: readonly string[];

  /**
   * Tipos de sitio web aplicables a servicios digitales.
   */
  siteTypes?: readonly string[];

  /**
   * Problemas o necesidades que el servicio puede ayudar a resolver.
   */
  needs?: readonly string[];

  /**
   * Agrupación estructurada del alcance profesional.
   */
  scopeGroups?: readonly ServiceScopeGroup[];

  /**
   * Módulos o componentes configurables del servicio.
   */
  moduleGroups?: readonly ServiceModuleGroup[];

  /**
   * Actuaciones, productos o subservicios concretos.
   *
   * En BúhoDoc contiene escritos judiciales, recursos,
   * actuaciones administrativas, instrumentos contractuales
   * y otros documentos jurídicos.
   */
  subOffers?: readonly ServiceSubOffer[];

  /**
   * Factores que pueden influir en la propuesta económica.
   */
  budgetFactors?: readonly string[];

  /**
   * Responsabilidades o componentes técnicos diferenciados.
   */
  technicalResponsibilities?: readonly ServiceTechnicalResponsibility[];

  /**
   * Información necesaria para realizar la evaluación inicial.
   */
  evaluationInputs?: readonly string[];

  /**
   * Entregables que potencialmente pueden formar parte
   * del alcance contratado.
   */
  potentialDeliverables?: readonly string[];

  /**
   * Etapas generales del trabajo.
   */
  stages?: readonly string[];

  /**
   * Condiciones que deben cumplirse antes o durante
   * la prestación del servicio.
   */
  prerequisites?: readonly string[];

  /**
   * Advertencia relativa a contenido, documentación,
   * propiedad intelectual u obligaciones del cliente.
   */
  clientContentNotice?: string;
}
