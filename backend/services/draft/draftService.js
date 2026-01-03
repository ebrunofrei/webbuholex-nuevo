// ======================================================================
// 🧠 draftService — Persistencia de borradores (FASE C.2.1)
// ======================================================================

import DraftSnapshot from "../../models/DraftSnapshot.js";

export async function saveDraftSnapshot({
  caseId,
  chatId,
  messages,
  cognitiveContext,
  userId,
  snapshot,
  meta = {},
}) {
  if (!caseId || !chatId || !userId || !snapshot) {
    throw new Error("Datos insuficientes para guardar borrador");
  }

  const draft = await DraftSnapshot.create({
    caseId,
    chatId,
    createdBy: userId,
    snapshot,
    meta,
  });

  return {
    draftId: draft._id,
    createdAt: draft.createdAt,
  };
}
