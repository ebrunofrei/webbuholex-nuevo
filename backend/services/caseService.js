import mongoose from "mongoose";
import CaseSession from "../models/CaseSession.js";
import CaseMessage from "../models/CaseMessage.js";

const { Types } = mongoose;

/* ============================================================
   🧠 CASE SERVICE — HISTORIAL JURÍDICO ESTRUCTURADO (REFINADO)
============================================================ */

/* =========================
   HELPERS INTERNOS
========================= */

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId requerido");
  }
}

function assertCaseId(caseId) {
  if (!caseId || !Types.ObjectId.isValid(caseId)) {
    const err = new Error("caseId inválido");
    err.code = "INVALID_CASE_ID";
    throw err;
  }
}

/* =========================
   LISTAR CASOS
========================= */

export async function listCasesByUser(userId) {
  assertUserId(userId);

  return CaseSession.find({ userId })
    .sort({ updatedAt: -1 })
    .lean();
}

/* =========================
   CREAR CASO
========================= */

export async function createCase({
  userId,
  title,
  area,
  jurisdiction,
}) {
  assertUserId(userId);

  return CaseSession.create({
    userId,
    title,
    area,
    jurisdiction,
  });
}

/* =========================
   OBTENER CASO (OWNERSHIP)
========================= */

export async function getCaseById({ caseId, userId }) {
  assertUserId(userId);
  assertCaseId(caseId);

  return CaseSession.findOne({
    _id: caseId,
    userId,
  }).lean();
}

/* =========================
   MENSAJES DEL CASO
========================= */

export async function getCaseMessages(caseId) {
  assertCaseId(caseId);

  return CaseMessage.find({ caseId })
    .sort({ createdAt: 1 })
    .lean();
}

/* =========================
   AGREGAR MENSAJE
========================= */

export async function addCaseMessage({
  caseId,
  userId,
  role,
  content,
  attachments = [],
}) {
  assertUserId(userId);
  assertCaseId(caseId);

  if (!role || !content) {
    throw new Error("role y content requeridos");
  }

  const caseSession = await CaseSession.findOne({
    _id: caseId,
    userId,
  });

  if (!caseSession) {
    const err = new Error("Caso no encontrado");
    err.code = "CASE_NOT_FOUND";
    throw err;
  }

  const message = await CaseMessage.create({
    caseId,
    role,
    content,
    attachments,
  });

  caseSession.updatedAt = new Date();
  await caseSession.save();

  return message.toObject();
}

/* =========================
   ACTUALIZAR CASO
========================= */

export async function updateCase({
  caseId,
  userId,
  title,
  status,
  area,
  jurisdiction,
}) {
  assertUserId(userId);
  assertCaseId(caseId);

  return CaseSession.findOneAndUpdate(
    { _id: caseId, userId },
    { title, status, area, jurisdiction },
    { new: true }
  ).lean();
}
