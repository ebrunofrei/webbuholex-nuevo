// backend/brain/procedural/recommendationEngine.js
// =================================================
// 🧭 RECOMMENDATION ENGINE – FASE C5
// Traduce vicios + agravios en acciones procesales
// =================================================

export function buildProceduralRecommendation({
  vicio,
  agravios = [],
  checklist = [],
  contexto = {},
}) {
  if (!vicio || !vicio.level) {
    return {
      accion: "NINGUNA",
      fundamento: "No se detectan vicios procesales relevantes.",
      riesgo: "BAJO",
    };
  }

  // 🔥 VICIO DETERMINANTE
  if (vicio.level === "DETERMINANTE") {
    return {
      accion: "NULIDAD",
      via: "INCIDENTE O APELACIÓN",
      petitorio: "Se declare la nulidad de la resolución por vicio insubsanable.",
      fundamento:
        "El vicio afecta el derecho al debido proceso y la motivación suficiente.",
      soporte: agravios.map((a) => a.titulo),
      riesgo: "BAJO",
      recomendacion:
        "Plantear nulidad inmediata. No esperar sentencia final.",
    };
  }

  // ⚠️ VICIO GRAVE
  if (vicio.level === "GRAVE") {
    return {
      accion: "APELACIÓN",
      via: "ORDINARIA",
      petitorio:
        "Se revoque la resolución por defectos graves de motivación lógica.",
      fundamento:
        "Existen agravios relevantes que comprometen la validez del razonamiento.",
      soporte: agravios.map((a) => a.titulo),
      riesgo: "MEDIO",
      recomendacion:
        "Acumular agravios y reforzar con jurisprudencia antes de elevar.",
    };
  }

  // 🟡 VICIO LEVE
  return {
    accion: "RESERVA",
    via: "EVENTUAL",
    petitorio:
      "Se deja constancia del vicio para eventual impugnación posterior.",
    fundamento:
      "El defecto no genera indefensión inmediata, pero debe quedar registrado.",
    riesgo: "ALTO",
    recomendacion:
      "No accionar ahora. Documentar para fase posterior del proceso.",
  };
}
