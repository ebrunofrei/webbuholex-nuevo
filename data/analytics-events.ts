import type { FutureAnalyticsEvent, FutureAnalyticsEventName } from "@/types/access";

const purposes: Readonly<Record<FutureAnalyticsEventName, string>> = {
  portal_public_enter: "Conocer la intención de ingresar a la zona pública.",
  portal_intelligent_enter: "Conocer la intención de ingresar al espacio inteligente.",
  legal_panel_open: "Medir la consulta del panel institucional.",
  legal_policy_open: "Medir la apertura futura de una política legal.",
  public_resource_open: "Medir el acceso a un recurso público.",
  jurisprudence_open: "Medir la apertura de una ficha jurisprudencial.",
  manual_open: "Medir la apertura de un manual público.",
  product_view: "Medir la visualización de una ficha de producto.",
  service_view: "Medir la visualización de un servicio.",
  assistant_cta_open: "Medir la intención de consultar al asistente.",
  signup_start: "Medir el inicio futuro de registro.",
  login_start: "Medir el inicio futuro de autenticación.",
  premium_feature_intent: "Medir interés futuro en una capacidad premium.",
  jurisprudence_search: "Medir el uso futuro de la búsqueda jurisprudencial sin conservar el texto consultado.",
  jurisprudence_result_open: "Medir la apertura de un resultado jurisprudencial.",
  official_source_open: "Medir el acceso voluntario a una fuente oficial.",
  jurisprudence_filter_apply: "Medir el uso futuro de filtros jurisprudenciales sin conservar su contenido sensible.",
  jurisprudence_assistant_intent: "Medir la intención de usar jurisprudencia asistida.",
  quick_read_intent: "Medir la intención de usar lectura veloz.",
  compare_intent: "Medir la intención de comparar resoluciones.",
  applicability_intent: "Medir la intención de evaluar aplicabilidad.",
  signup_from_jurisprudence: "Medir la intención futura de registro desde jurisprudencia.",
  premium_analysis_intent: "Medir interés futuro en análisis premium.",
};

export const futureAnalyticsEvents: readonly FutureAnalyticsEvent[] = (Object.keys(purposes) as FutureAnalyticsEventName[]).map((name): FutureAnalyticsEvent => ({
  name,
  status: "modeled_only",
  sendsToThirdParties: false,
  permitsLegalQueryContent: false,
  purpose: purposes[name],
}));
