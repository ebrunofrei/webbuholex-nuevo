// ============================================================
// 🛡️ requireCaseRole — Canonical Case Guard
// ------------------------------------------------------------
// - Verifica participación del usuario en el caso
// - Alineado con sessionId canónico (case_<id>)
// ============================================================

import mongoose from "mongoose";
import CaseSession from "../models/CaseSession.js";

export function requireCaseRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id;

      // 🔑 caseId se obtiene en este orden:
      // 1) Inyectado por validateSessionId
      // 2) params
      // 3) body
      const caseId =
        req.caseId ||
        req.params?.caseId ||
        req.body?.caseId;

      if (!userId || !caseId) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado (usuario o caso no identificado)",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(caseId)) {
        return res.status(400).json({
          ok: false,
          error: "caseId inválido",
        });
      }

      // 🔍 Buscar el caso y validar participación
      const caseSession = await CaseSession.findOne({
        _id: caseId,
        "participants.userId": userId,
      }).lean();

      if (!caseSession) {
        return res.status(404).json({
          ok: false,
          error: "Caso no encontrado o sin acceso",
        });
      }

      const participant = caseSession.participants.find(
        (p) => String(p.userId) === String(userId)
      );

      if (!participant) {
        return res.status(403).json({
          ok: false,
          error: "Usuario no es participante del caso",
        });
      }

      if (
        Array.isArray(allowedRoles) &&
        allowedRoles.length > 0 &&
        !allowedRoles.includes(participant.role)
      ) {
        return res.status(403).json({
          ok: false,
          error: "Permisos insuficientes para esta acción",
        });
      }

      // 🔐 Inyectar contexto seguro
      req.caseSession = caseSession;
      req.caseRole = participant.role;
      req.caseId = caseId;

      next();
    } catch (err) {
      console.error("[requireCaseRole]", err);
      return res.status(500).json({
        ok: false,
        error: "Error validando permisos del caso",
      });
    }
  };
}
