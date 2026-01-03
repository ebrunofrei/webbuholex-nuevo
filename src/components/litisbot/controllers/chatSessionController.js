// ============================================================
// 🦉 BúhoLex | Chat Session Controller (Frontend - CANÓNICO)
// ------------------------------------------------------------
// Rol:
// - Orquestar sesiones de chat
// - NO lógica cognitiva
// - NO UI
// - Decide si la sesión es:
//   a) contextual (pertenece a un caso)
//   b) global (hilo libre)
// ============================================================

import { GLOBAL_CONTEXT_ID } from "@/components/litisbot/chat/helpers/analysisStore.js";

/* ============================================================================
   UTILIDADES
============================================================================ */

function resolveSessionId({ contextId }) {
  // Contexto → sesión ligada al caso
  if (contextId && contextId !== GLOBAL_CONTEXT_ID) {
    return `case_${contextId}`;
  }

  // Hilo libre → sesión global
  return "global";
}

/* ============================================================================
   CREAR / ASEGURAR SESIÓN
   - Se llama cuando el usuario entra a un análisis
   - Si ya existe, backend debe devolverla
============================================================================ */

export async function ensureSession({
  usuarioId,
  contextId = null,
}) {
  if (!usuarioId) {
    return { error: "usuarioId requerido" };
  }

  const sessionId = resolveSessionId({ contextId });

  try {
    const res = await fetch(`/api/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioId,
        contextId: contextId ?? null,
        sessionId, // 🔒 CANÓNICO
      }),
    });

    const json = await res.json();

    if (!json?.ok) {
      return {
        error: json?.error || "No se pudo asegurar la sesión",
      };
    }

    return json.session;
  } catch (err) {
    console.error("ensureSession error:", err);
    return { error: "Error de red asegurando sesión" };
  }
}

/* ============================================================================
   LISTAR SESIONES DE UN CONTEXTO
   - Contexto → sesiones del caso
   - Global → sesiones libres
============================================================================ */

export async function listSessions({
  usuarioId,
  contextId = null,
}) {
  if (!usuarioId) return [];

  const sessionId = resolveSessionId({ contextId });

  try {
    const res = await fetch(
      `/api/chat/sessions?usuarioId=${usuarioId}&sessionId=${sessionId}`
    );

    const json = await res.json();
    if (!json?.ok) return [];

    return Array.isArray(json.sessions)
      ? json.sessions
      : [];
  } catch (err) {
    console.error("listSessions error:", err);
    return [];
  }
}

/* ============================================================================
   CARGAR HISTORIAL (REHIDRATACIÓN)
============================================================================ */

export async function loadHistory({ sessionId }) {
  if (!sessionId) return [];

  try {
    const res = await fetch(
      `/api/chat/sessions/${sessionId}/history`
    );

    const json = await res.json();
    if (!json?.ok) return [];

    return Array.isArray(json.historial)
      ? json.historial
      : [];
  } catch (err) {
    console.error("loadHistory error:", err);
    return [];
  }
}
