// ======================================================================
// 🗂️ caseController — Gestión canónica de Casos
// ----------------------------------------------------------------------
// - Fuente única de verdad de los CASOS
// - Persistencia inicial: localStorage (namespaced)
// - Listo para migrar a backend sin tocar UI
// ======================================================================

const STORAGE_KEY = (uid) => `litisbot:${uid}:cases`;
const ACTIVE_KEY = (uid) => `litisbot:${uid}:case_active`;

/* -------------------------------------------------
   Utils seguros
------------------------------------------------- */
function safeParse(json, fallback = []) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadCases(uid) {
  if (!uid) return [];
  const raw = localStorage.getItem(STORAGE_KEY(uid));
  return safeParse(raw);
}

function saveCases(uid, cases) {
  if (!uid) return;
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(cases));
}

/* =================================================
   API PÚBLICA
================================================= */

/**
 * Lista todos los casos del usuario
 */
export async function listCases(usuarioId) {
  return loadCases(usuarioId);
}

/**
 * Crea un nuevo caso
 */
export async function createCase(usuarioId, { title }) {
  const cases = loadCases(usuarioId);

  const nuevo = {
    id: crypto.randomUUID(),
    title: title?.trim() || "Nuevo caso",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updated = [nuevo, ...cases];
  saveCases(usuarioId, updated);
  setActiveCase(usuarioId, nuevo.id);

  return nuevo;
}

/**
 * Renombra un caso
 */
export async function renameCase(usuarioId, caseId, title) {
  const cases = loadCases(usuarioId).map((c) =>
    c.id === caseId
      ? { ...c, title: title.trim(), updatedAt: Date.now() }
      : c
  );

  saveCases(usuarioId, cases);
  return cases;
}

/**
 * Elimina un caso
 */
export async function deleteCase(usuarioId, caseId) {
  const cases = loadCases(usuarioId).filter((c) => c.id !== caseId);
  saveCases(usuarioId, cases);

  const active = getActiveCase(usuarioId);
  if (active === caseId) {
    localStorage.removeItem(ACTIVE_KEY(usuarioId));
  }

  return cases;
}

/**
 * Caso activo
 */
export function getActiveCase(usuarioId) {
  return localStorage.getItem(ACTIVE_KEY(usuarioId));
}

export function setActiveCase(usuarioId, caseId) {
  localStorage.setItem(ACTIVE_KEY(usuarioId), caseId);
}
