// ============================================================================
// LITIS | Unified IA Router — CANONICAL R7.7++
// ============================================================================

import express from "express";
import admin from "../../services/myFirebaseAdmin.js";

import { handleHomeConsultive } from "./handleHomeConsultive.js";
import { handleBubbleConsultive } from "./handleBubbleConsultive.js";
import { handleProCognitive } from "./handleProCognitive.js";
import { handleUnlockAnalysis } from "./unlock-analysis.js";
import historyRouter from "./history.js";

const router = express.Router();


// ============================================================================
// 1️⃣ AUTH MIDDLEWARE GLOBAL (OBLIGATORIO)
// ----------------------------------------------------------------------------
// - Decodifica Bearer token si existe
// - NO bloquea si no hay token
// - Solo agrega req.user cuando es válido
// ============================================================================

router.use(async (req, res, next) => {
  try {
    const h = req.headers.authorization || "";

    if (h.startsWith("Bearer ")) {
      const token = h.slice("Bearer ".length).trim();
      const decoded = await admin.auth().verifyIdToken(token);

      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        plan: decoded.plan || "pro", // opcional si lo usas
      };
    }
  } catch (err) {
    console.warn("⚠️ Token inválido o expirado");
  }

  next();
});


// ============================================================================
// 2️⃣ Always JSON
// ============================================================================

router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});


// ============================================================================
// 3️⃣ History
// ============================================================================

router.use("/history", historyRouter);


// ============================================================================
// 4️⃣ NON-CHAT IA ACTIONS
// ============================================================================

router.post("/unlock-analysis", async (req, res) => {
  try {
    return await handleUnlockAnalysis(req, res);
  } catch (err) {
    console.error("🔥 [Unlock Analysis Fatal]", err);
    return res.status(500).json({
      ok: false,
      error: "unlock_failed",
    });
  }
});


// ============================================================================
// 5️⃣ CHAT GATEWAY
// ============================================================================

router.post("/chat", async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.prompt || typeof body.prompt !== "string") {
      return res.status(400).json({
        ok: false,
        error: "invalid_prompt",
      });
    }

    if (!body.sessionId || typeof body.sessionId !== "string") {
      return res.status(400).json({
        ok: false,
        error: "missing_session_id",
      });
    }

    const channel = body.channel || "home_chat";
    const role = body.role || "consultive";

    if (role === "cognitive" && channel !== "pro_chat") {
      return res.status(400).json({
        ok: false,
        error: "invalid_channel_role_combination",
      });
    }

    // 🔒 PRO requiere usuario autenticado real
    if (channel === "pro_chat") {
      if (!req.user?.uid) {
        return res.status(401).json({
          ok: false,
          error: "auth_required",
        });
      }

      return await handleProCognitive(req, res);
    }

    if (channel === "bubble_chat" || channel === "juris_bubble") {
      return await handleBubbleConsultive(req, res);
    }

    return await handleHomeConsultive(req, res);

  } catch (err) {
    console.error("🔥 [IA Router Fatal Error]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
    });
  }
});

export default router;