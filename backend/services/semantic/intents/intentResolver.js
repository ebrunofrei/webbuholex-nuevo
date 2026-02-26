// ============================================================
// 🧠 intentResolver.js — Intent Engine (CANÓNICO v3)
// ------------------------------------------------------------
// - Clasificador semántico ligero
// - Inmune a tildes
// - Escalable por score
// - Diferencia teoría vs ejecución
// - No ejecuta acciones
// - Solo devuelve { intent, payload }
// ============================================================

import { safeStr } from "./litisEngineCore.js";

/* ============================================================
   NORMALIZACIÓN BASE
============================================================ */

const CLEAN = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/* ============================================================
   DETECTORES LINGÜÍSTICOS
============================================================ */

function isTheoreticalQuestion(p) {
  // Detecta preguntas epistemológicas/metodológicas
  return /\b(como|que|cual|explicame|explica)\b.*\b(analiz|metodolog|procedimient|estructura)\b/i.test(
    p
  );
}

function containsDirectiveVerb(p) {
  // Raíces verbales jurídicas de acción
  return /\b(analiz|revis|examin|audit|evalu|cotej|escruti|estudi|proces)\w*\b/i.test(
    p
  );
}

function referencesConcreteObject(p, adjuntos = []) {
  const hasDeicticRef =
    /\b(este|esta|el presente|la presente|dicho|citado|adjunto)\b\s*\b(documento|texto|escrito|resolucion|demanda|auto|pieza|contenido)\b/i.test(
      p
    );

  const hasPointer =
    /\b(esto:|continuacion:|siguiente:)\b/i.test(p);

  const hasFiles =
    Array.isArray(adjuntos) && adjuntos.length > 0;

  return hasDeicticRef || hasPointer || hasFiles;
}

/* ============================================================
   DOCUMENT REVIEW — SCORE ENGINE
============================================================ */

function detectDocumentReview({ prompt, adjuntos = [] }) {
  const raw = safeStr(prompt);
  const p = CLEAN(raw);

  if (!p) return null;

  // 1️⃣ Bloqueo teoría
  if (isTheoreticalQuestion(p)) return null;

  let score = 0;

  if (containsDirectiveVerb(p)) score += 2;
  if (referencesConcreteObject(p, adjuntos)) score += 2;
  if (Array.isArray(adjuntos) && adjuntos.length > 0) score += 1;

  // Threshold profesional
  if (score >= 3) {
    return {
      intent: "document.review.request_confirmation",
      payload: {
        scope: "full",
        deepReasoning: true,
        detectContradictions: true,
        rhetoricalStructure: true,
        metadata: {
          confidence: score >= 4 ? "high" : "medium",
          score,
          source: "linguistic_pattern_v3",
          hasPhysicalAdjuntos: adjuntos.length > 0,
          requiresUserConfirmation: true,
        },
      },
    };
  }

  return null;
}

/* ============================================================
   AGENDA CREATE (Compatibilidad v1)
============================================================ */

function detectAgendaCreate({ reply, data }) {
  const r = CLEAN(safeStr(reply));

  if (!r) return null;

  if (/\b(agenda|agendar|evento|cita|reunion)\b/i.test(r)) {
    if (data?.payload && typeof data.payload === "object") {
      return {
        intent: "agenda.create",
        payload: data.payload,
      };
    }
  }

  return null;
}

/* ============================================================
   FUTUROS INTENTS (Placeholder)
============================================================ */

// Aquí puedes agregar:
// - document.compare
// - resolution.audit
// - contract.risk_scan
// - etc.

/* ============================================================
   RESOLVER GLOBAL
============================================================ */

export function resolveIntent({ prompt, reply, adjuntos = [], data }) {
  // 1️⃣ Document Review
  const docIntent = detectDocumentReview({ prompt, adjuntos });
  if (docIntent?.intent) return docIntent;

  // 2️⃣ Agenda
  const agendaIntent = detectAgendaCreate({ reply, data });
  if (agendaIntent?.intent) return agendaIntent;

  return null;
}