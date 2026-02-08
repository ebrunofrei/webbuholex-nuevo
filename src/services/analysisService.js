// ============================================================================
// 🧠 analysisService — Backend-first (CANÓNICO / PRODUCCIÓN)
// ----------------------------------------------------------------------------
// Dominio: ANÁLISIS (CaseSession)
// - CRUD real
// - Autenticado (Firebase)
// - NO IA
// - NO mensajes
// - Semántica jurídica explícita
// ============================================================================

const API_BASE = "/api/analyses";

/* ============================================================================
   API FETCH BASE
   - Autenticación robusta
   - Refresh de token
   - Manejo uniforme de errores
============================================================================ */
async function apiFetch(
  url,
  { user, method = "GET", body } = {}
) {
  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  let token;
  try {
    // 🔒 refresh forzado: evita sesiones muertas
    token = await user.getIdToken();
  } catch {
    throw new Error("Sesión expirada. Vuelva a iniciar sesión.");
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.error || "Error de comunicación con el servidor"
    );
  }

  return data;
}

/* ============================================================================
   LISTAR ANÁLISIS POR CONTEXTO (CASE)
============================================================================ */
export async function listAnalyses({ user, caseId }) {
  if (!caseId) return [];

  const data = await apiFetch(
    `${API_BASE}?caseId=${caseId}`,
    { user }
  );

  return Array.isArray(data.analyses) ? data.analyses : [];
}

/* ============================================================================
   CREAR ANÁLISIS (NUEVA SESIÓN DETERMINÍSTICA)
============================================================================ */
export async function createAnalysisAPI({
  user,
  caseId,
  title,
}) {
  if (!caseId) {
    throw new Error("caseId requerido para crear análisis");
  }

  const data = await apiFetch(API_BASE, {
    user,
    method: "POST",
    body: {
      caseId,
      title: title?.trim() || "",
    },
  });

  return data.analysis;
}

/* ============================================================================
   RENOMBRAR ANÁLISIS
============================================================================ */
export async function renameAnalysisAPI({
  user,
  analysisId,
  title,
}) {
  if (!analysisId) {
    throw new Error("analysisId requerido");
  }

  const data = await apiFetch(
    `${API_BASE}/${analysisId}`,
    {
      user,
      method: "PATCH",
      body: {
        title: title?.trim() || "",
      },
    }
  );

  return data.analysis;
}

/* ============================================================================
   ARCHIVAR / RESTAURAR ANÁLISIS (TOGGLE SEMÁNTICO)
============================================================================ */
export async function toggleArchiveAnalysisAPI({
  user,
  analysisId,
}) {
  if (!analysisId) {
    throw new Error("analysisId requerido");
  }

  const data = await apiFetch(
    `${API_BASE}/${analysisId}`,
    {
      user,
      method: "PATCH",
      body: {}, // el backend decide el toggle
    }
  );

  return data.analysis;
}

/* ============================================================================
   CAMBIAR ESTADO EXPLÍCITO (opcional, legal-grade)
============================================================================ */
export async function setAnalysisStatusAPI({
  user,
  analysisId,
  status,
}) {
  if (!analysisId) {
    throw new Error("analysisId requerido");
  }

  if (!["activo", "archivado"].includes(status)) {
    throw new Error("Estado de análisis inválido");
  }

  const data = await apiFetch(
    `${API_BASE}/${analysisId}`,
    {
      user,
      method: "PATCH",
      body: { status },
    }
  );

  return data.analysis;
}

/* ============================================================================
   ELIMINAR ANÁLISIS (IRREVERSIBLE)
============================================================================ */
export async function deleteAnalysisAPI({
  user,
  analysisId,
}) {
  if (!analysisId) {
    throw new Error("analysisId requerido");
  }

  await apiFetch(
    `${API_BASE}/${analysisId}`,
    {
      user,
      method: "DELETE",
    }
  );

  return true;
}
