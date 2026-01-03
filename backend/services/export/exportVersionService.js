// ============================================================================
// 📦 exportVersionService — Versionado jurídico (C.3.2)
// ============================================================================

import ExportVersion from "../../models/ExportVersion.js";

export async function createExportVersion({
  caseId,
  chatId,
  type,
  snapshotId,
  file,
  meta,
}) {
  const last = await ExportVersion.findOne({ caseId, chatId, type })
    .sort({ version: -1 })
    .lean();

  const nextVersion = last ? last.version + 1 : 1;

  return ExportVersion.create({
    caseId,
    chatId,
    type,
    version: nextVersion,
    snapshotId,
    file,
    meta,
  });
}
