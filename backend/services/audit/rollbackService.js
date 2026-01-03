import AuditEvent from "../../models/AuditEvent.js";

export async function rollbackToEvent({ caseId, targetEventId, actor }) {
  // 1️⃣ Obtener evento destino
  const target = await AuditEvent.findById(targetEventId);
  if (!target || target.caseId !== caseId) {
    throw new Error("Evento inválido para rollback");
  }

  // 2️⃣ Desactivar eventos posteriores
  await AuditEvent.updateMany(
    {
      caseId,
      createdAt: { $gt: target.createdAt },
      isActive: true,
    },
    { $set: { isActive: false } }
  );

  // 3️⃣ Asegurar que el target queda activo
  await AuditEvent.updateOne(
    { _id: targetEventId },
    { $set: { isActive: true } }
  );

  return {
    ok: true,
    activeEventId: targetEventId,
  };
}
