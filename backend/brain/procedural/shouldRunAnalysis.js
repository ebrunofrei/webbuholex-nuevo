// ======================================================================
// ⚙️ SHOULD RUN ANALYSIS — GATILLO SENIOR DE ANÁLISIS (R3 CANÓNICO)
// ----------------------------------------------------------------------
// PRINCIPIO RECTOR:
// El análisis se activa SOLO si:
// - Aporta a una DECISIÓN jurídica
// - Permite evaluar RIESGO / VICIO / OPORTUNIDAD
// - Existe estructura argumentativa controlable
//
// NO:
// - Clases
// - Definiciones
// - Dogmática exhaustiva
// - Cortesía conversacional
// ======================================================================

export function shouldRunAnalysis({
  prompt = "",
  cognitive = {},
  toolMode,
}) {
  const p = String(prompt).trim().toLowerCase();

  /* -------------------------------------------------------------
     0️⃣ DESCARTE INMEDIATO (SOCIAL / OPERATIVO)
  ------------------------------------------------------------- */
  if (
    /^(hola|buenas|gracias|ok|listo|perfecto|cómo estás|entiendo|dale)/i.test(p)
  ) {
    return false;
  }

  if (/\b(agenda|evento|calendario|cita|reunión)\b/i.test(p)) {
    return false;
  }

  /* -------------------------------------------------------------
     1️⃣ TOOL MODE EXPLÍCITO (MANDATO)
  ------------------------------------------------------------- */
  if (toolMode === "analysis") return true;

  /* -------------------------------------------------------------
     2️⃣ PERFIL COGNITIVO EXIGENTE (SENIOR)
  ------------------------------------------------------------- */
  const prof = cognitive?.profile || {};

  const exigeControl =
    prof.controlDeFalacias ||
    prof.rigor === true ||
    prof.profundidad === "alta";

  if (exigeControl && p.length >= 80) {
    return true;
  }

  /* -------------------------------------------------------------
     3️⃣ ESTRUCTURA DECISORIA DETECTABLE
     (no longitud, sino forma)
  ------------------------------------------------------------- */
  const estructuraDecisoria =
    /\b(por tanto|por ende|sin embargo|considerando|fundamento|agravio|nulidad|resuelvo|corresponde|procede|no procede)\b/.test(
      p
    );

  if (estructuraDecisoria && p.length >= 120) {
    return true;
  }

  /* -------------------------------------------------------------
     4️⃣ INTENCIÓN DE CONTROL / AUDITORÍA / RIESGO
  ------------------------------------------------------------- */
  const controlJuridico =
    /\b(auditar|evaluar|control|verificar|revisar|detectar|identificar)\b/.test(
      p
    );

  const vicioORiesgo =
    /\b(nulidad|vicio|incoherencia|contradicción|motivaci[oó]n|falaci|agravios?|error material)\b/.test(
      p
    );

  if (controlJuridico || vicioORiesgo) {
    // Evita modo docente
    const esConsultaTeorica =
      p.length < 160 &&
      /\b(qué es|defin|significa|concepto|explica|teoría)\b/.test(p);

    if (!esConsultaTeorica) {
      return true;
    }
  }

  /* -------------------------------------------------------------
     5️⃣ CIERRE: NO APORTA DECISIÓN → NO ANÁLISIS
  ------------------------------------------------------------- */
  return false;
}
