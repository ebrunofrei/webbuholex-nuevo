// ============================================================================
// 🧠 anchorService — Memoria Semántica Persistente
// ----------------------------------------------------------------------------
// - Crea / carga / actualiza ConversationAnchor
// - No guarda mensajes
// - Fuente de verdad del estado cognitivo
// ============================================================================

import ConversationAnchor from "../../models/ConversationAnchor.js";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const clean = (v = "", max = 8000) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// ---------------------------------------------------------------------------
// OBTENER O CREAR ANCLA (IDEMPOTENTE)
// ---------------------------------------------------------------------------

export async function getOrCreateAnchor({
  sessionId,
  caseId,
  userId,
  prompt,
  intent = "criterio",
  phase = "explore",
}) {
  if (!sessionId || !caseId || !userId) return null;

  let anchor = await ConversationAnchor.findOne({ sessionId }).lean();

  // -------------------------------------------------------------------------
  // SI EXISTE → ACTUALIZA ESTADO (NO pisa instructionRoot)
  // -------------------------------------------------------------------------
  if (anchor) {
    await ConversationAnchor.updateOne(
      { sessionId },
      {
        $set: {
          state: { intent, phase },
          updatedAt: new Date(),
        },
      }
    );
    return anchor;
  }

  // -------------------------------------------------------------------------
  // SI NO EXISTE → CREA ANCLA FUNDACIONAL
  // -------------------------------------------------------------------------
  const instructionText = clean(prompt);

  const created = await ConversationAnchor.create({
    sessionId,
    caseId,
    userId,

    instructionRoot: {
      text: instructionText,
      createdAt: new Date(),
    },

    objective: {
      type: intent,
      description: instructionText.slice(0, 280),
    },

    state: {
      intent,
      phase,
    },

    contextSnapshot: {},
  });

  return created.toObject();
}

// ---------------------------------------------------------------------------
// CARGAR ANCLA
// ---------------------------------------------------------------------------

export async function loadAnchor(sessionId) {
  if (!sessionId) return null;

  return ConversationAnchor.findOne({ sessionId }).lean();
}

// ---------------------------------------------------------------------------
// ACTUALIZAR SOLO ESTADO (INTENT / PHASE)
// ---------------------------------------------------------------------------

export async function updateAnchorState(
  sessionId,
  { intent, phase }
) {
  if (!sessionId) return false;

  const update = {};
  if (intent) update["state.intent"] = intent;
  if (phase) update["state.phase"] = phase;

  if (!Object.keys(update).length) return false;

  await ConversationAnchor.updateOne(
    { sessionId },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );

  return true;
}

// ---------------------------------------------------------------------------
// ACTUALIZAR SNAPSHOT SEMÁNTICO (RESÚMENES)
// ---------------------------------------------------------------------------

export async function updateContextSnapshot(
  sessionId,
  snapshot = {}
) {
  if (!sessionId || !snapshot) return false;

  await ConversationAnchor.updateOne(
    { sessionId },
    {
      $set: {
        contextSnapshot: snapshot,
        updatedAt: new Date(),
      },
    }
  );

  return true;
}
