// ============================================================================
// 🧠 analysisMessagesService — Frontend (CANÓNICO / PRODUCCIÓN)
// ----------------------------------------------------------------------------
// Dominio: MENSAJES DE ANÁLISIS (CaseSession)
// - Persistencia real
// - Autenticado (Firebase)
// - NO IA
// - NO prompts
// - Auditoría jurídica-grade
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
    // 🔒 refresh forzado para evitar tokens muertos
    token = await user.getIdToken(true);
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
   LISTAR MENSAJES DEL ANÁLISIS (REHIDRATACIÓN)
============================================================================ */
export async function listAnalysisMessages({
  user,
  analysisId,
}) {
  if (!analysisId) return [];

  const data = await apiFetch(
    `${API_BASE}/${analysisId}/messages`,
    { user }
  );

  return Array.isArray(data.messages) ? data.messages : [];
}

/* ============================================================================
   CREAR MENSAJE (user | assistant)
============================================================================ */
export async function createAnalysisMessage({
  user,
  analysisId,
  role,
  content,
  attachments = [],
}) {
  if (!analysisId) {
    throw new Error("analysisId requerido");
  }

  if (!role || !["user", "assistant"].includes(role)) {
    throw new Error("role inválido");
  }

  if (!content || !String(content).trim()) {
    throw new Error("content requerido");
  }

  const data = await apiFetch(
    `${API_BASE}/${analysisId}/messages`,
    {
      user,
      method: "POST",
      body: {
        role,
        content: String(content).trim(),
        attachments: Array.isArray(attachments)
          ? attachments
          : [],
      },
    }
  );

  return data.message;
}
