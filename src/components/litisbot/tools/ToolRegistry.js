/**
 * ============================================================
 * 🧰 ToolRegistry – LitisBot
 * ------------------------------------------------------------
 * Catálogo único de herramientas jurídicas reutilizables.
 *
 * Reglas:
 * - NO importa lógica de chat
 * - NO renderiza UI
 * - SOLO describe herramientas (metadata + componente)
 *
 * Los contenedores (ChatBase / ChatPro / BubbleChat) deciden:
 * - si se muestran
 * - en qué contexto
 * - restricciones por plan
 * ============================================================
 */

import TercioPena from "./penal/TercioPena";
import LiquidacionLaboral from "./laboral/LiquidacionLaboral";
import TraductorJuridico from "./general/TraductorJuridico";
import ChatMultilingue from "./general/ChatMultilingue";
import ModoAudiencia from "./audiencia/ModoAudiencia";

// A futuro se irán agregando:
// import LiquidacionLaboral from "./laboral/LiquidacionLaboral";
// import Traductor from "./general/Traductor";
// import Agenda from "./agenda/Agenda";
// import Recordatorios from "./agenda/Recordatorios";
// import AudienciaHelper from "./audiencia/AudienciaHelper";

export const TOOL_REGISTRY = {
  tercio_pena: {
    key: "tercio_pena",
    label: "Tercio de la pena",
    area: "penal",
    description:
      "Calcula tercio, mitad y cuarto de la pena impuesta.",
    pro: false,                 // demo + pro
    component: TercioPena,
    tags: ["penal", "condena", "beneficios"],
  },
liquidacion_laboral: {
  key: "liquidacion_laboral",
  label: "Liquidación laboral",
  area: "laboral",
  description:
    "Calcula CTS, vacaciones y gratificación trunca.",
  pro: false,
  component: LiquidacionLaboral,
  tags: ["laboral", "cts", "beneficios"],
},

traductor_juridico: {
  key: "traductor_juridico",
  label: "Traductor jurídico",
  area: "general",
  description:
    "Traduce textos legales manteniendo precisión jurídica.",
  pro: false,
  component: TraductorJuridico,
  tags: ["traducción", "idiomas", "jurídico"],
},

chat_multilingue: {
  key: "chat_multilingue",
  label: "Chat multilingüe",
  area: "general",
  description: "Cambia el idioma de interacción del asistente.",
  pro: false,
  component: ChatMultilingue,
  tags: ["idiomas", "chat"],
},

modo_audiencia: {
  key: "modo_audiencia",
  label: "Modo Audiencia",
  area: "audiencia",
  description:
    "Guía y notas rápidas para audiencias en tiempo real.",
  pro: true,
  component: ModoAudiencia,
  tags: ["audiencia", "procesal", "penal"],
},

  // ==== EJEMPLOS (se activan cuando migremos las herramientas) ====
  /*
  liquidacion_laboral: {
    key: "liquidacion_laboral",
    label: "Liquidación laboral",
    area: "laboral",
    description:
      "Calcula CTS, vacaciones y beneficios sociales.",
    pro: false,
    component: LiquidacionLaboral,
    tags: ["laboral", "cts", "beneficios"],
  },

  traductor: {
    key: "traductor",
    label: "Traductor jurídico",
    area: "general",
    description:
      "Traduce textos jurídicos a otros idiomas.",
    pro: false,
    component: Traductor,
    tags: ["idiomas", "traducción"],
  },

  agenda: {
    key: "agenda",
    label: "Agenda jurídica",
    area: "agenda",
    description:
      "Gestiona plazos, audiencias y recordatorios.",
    pro: true,                  // solo PRO
    component: Agenda,
    tags: ["plazos", "audiencias"],
  },
  */
};

/**
 * Helpers opcionales (útiles para ChatPro / filtros)
 */
export function getToolsList() {
  return Object.values(TOOL_REGISTRY);
}

export function getToolByKey(key) {
  return TOOL_REGISTRY[key] || null;
}

export function getToolsByArea(area) {
  return Object.values(TOOL_REGISTRY).filter(
    (t) => t.area === area
  );
}
