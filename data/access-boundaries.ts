import type { AccessBoundary, CookieCategory } from "@/types/access";

export const accessBoundaries: readonly AccessBoundary[] = [
  {
    id: "public",
    label: "Público",
    loginRequired: false,
    paymentRequired: false,
    status: "available",
    capabilities: ["Buscar y leer jurisprudencia pública", "Consultar manuales, legislación y artículos", "Usar herramientas públicas", "Explorar productos, servicios y condiciones futuras"],
  },
  {
    id: "future_account",
    label: "Cuenta gratuita",
    loginRequired: true,
    paymentRequired: false,
    status: "planned",
    capabilities: ["Guardar jurisprudencia y búsquedas", "Crear colecciones y favoritos", "Conservar historial y continuar lecturas", "Acceder a una prueba limitada del Asistente Legal"],
  },
  {
    id: "future_premium",
    label: "Premium",
    loginRequired: true,
    paymentRequired: true,
    status: "planned",
    capabilities: ["Analizar y comparar resoluciones", "Evaluar aplicabilidad y documentos", "Gestionar proyectos y automatizaciones", "Acceder a exportaciones, productos adquiridos y servicios contratados"],
  },
] as const;

export const cookieCategories: readonly CookieCategory[] = [
  { id: "necessary", enabled: true, requiresConsent: false, description: "Funciones técnicas indispensables de la aplicación." },
  { id: "analytics", enabled: false, requiresConsent: true, description: "Medición futura, todavía no instalada." },
  { id: "personalization", enabled: false, requiresConsent: true, description: "Preferencias futuras, todavía no instaladas." },
  { id: "advertising", enabled: false, requiresConsent: true, description: "Publicidad futura, todavía no instalada." },
] as const;
