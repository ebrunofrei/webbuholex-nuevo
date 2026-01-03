// ============================================================================
// 🧠 analysisStore — Local-first helpers (CANÓNICO)
// ----------------------------------------------------------------------------
// - Análisis con o sin contexto
// - Fuente: localStorage
// - Sin lógica cognitiva
// - Clave estable por usuario + contexto
// ============================================================================

/* ============================================================================
   CONTEXTO GLOBAL (HILOS LIBRES)
============================================================================ */

export const GLOBAL_CONTEXT_ID = "__global__";

/* ============================================================================
   STORAGE KEY
============================================================================ */

function resolveContextId(contextId) {
  return contextId ?? GLOBAL_CONTEXT_ID;
}

function storageKey({ usuarioId, contextId }) {
  if (!usuarioId) return null;
  const ctx = resolveContextId(contextId);
  return `litisbot:analyses:${usuarioId}:${ctx}`;
}

/* ============================================================================
   LOAD / SAVE
============================================================================ */

export function loadAnalyses({ usuarioId, contextId }) {
  const k = storageKey({ usuarioId, contextId });
  if (!k) return [];

  try {
    const raw = localStorage.getItem(k);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalyses({ usuarioId, contextId, analyses }) {
  const k = storageKey({ usuarioId, contextId });
  if (!k) return;

  localStorage.setItem(
    k,
    JSON.stringify(Array.isArray(analyses) ? analyses : [])
  );
}

/* ============================================================================
   UTILIDADES
============================================================================ */

export function makeAnalysisTitle({ base = "Análisis", index = 1 } = {}) {
  return `${base} ${index}`;
}

/* ============================================================================
   CREATE
============================================================================ */

export function createAnalysis({ usuarioId, contextId = null, title }) {
  const ctx = resolveContextId(contextId);
  const list = loadAnalyses({ usuarioId, contextId: ctx });

  // índice solo con análisis activos
  const nextIndex = list.filter(a => !a?.archivedAt).length + 1;

  const next = {
    id: crypto.randomUUID(),
    contextId: ctx, // 🔒 siempre explícito
    title:
      (typeof title === "string" && title.trim()) ||
      makeAnalysisTitle({ index: nextIndex }),
    createdAt: new Date().toISOString(),
    archivedAt: null,
    _version: 1,
  };

  const merged = [next, ...list];
  saveAnalyses({ usuarioId, contextId: ctx, analyses: merged });

  return {
    created: next,
    list: merged,
  };
}

/* ============================================================================
   RENAME
============================================================================ */

export function renameAnalysis({
  usuarioId,
  contextId = null,
  analysisId,
  title,
}) {
  const ctx = resolveContextId(contextId);
  const list = loadAnalyses({ usuarioId, contextId: ctx });
  const clean = typeof title === "string" ? title.trim() : "";

  const next = list.map(a =>
    a?.id === analysisId
      ? { ...a, title: clean || a.title || "Análisis" }
      : a
  );

  saveAnalyses({ usuarioId, contextId: ctx, analyses: next });
  return next;
}

/* ============================================================================
   ARCHIVE / RESTORE (TOGGLE)
============================================================================ */

export function archiveAnalysis({
  usuarioId,
  contextId = null,
  analysisId,
}) {
  const ctx = resolveContextId(contextId);
  const list = loadAnalyses({ usuarioId, contextId: ctx });

  const next = list.map(a =>
    a?.id === analysisId
      ? {
          ...a,
          archivedAt: a.archivedAt
            ? null
            : new Date().toISOString(),
        }
      : a
  );

  saveAnalyses({ usuarioId, contextId: ctx, analyses: next });
  return next;
}

/* ============================================================================
   DELETE
============================================================================ */

export function deleteAnalysis({
  usuarioId,
  contextId = null,
  analysisId,
}) {
  const ctx = resolveContextId(contextId);
  const list = loadAnalyses({ usuarioId, contextId: ctx });

  const next = list.filter(a => a?.id !== analysisId);
  saveAnalyses({ usuarioId, contextId: ctx, analyses: next });

  return next;
}
