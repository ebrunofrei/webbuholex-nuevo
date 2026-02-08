// backend/routes/ia/unlock-analysis.js
import fetch from "node-fetch";
import Usuario from "../../models/Usuario.js";

const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export async function handleUnlockAnalysis(req, res) {
  try {
    const usuarioId = req.user?.id || req.body?.usuarioId;
    const culqiToken = req.body?.culqiToken;

    if (!usuarioId || !culqiToken) {
      return res.status(400).json({
        ok: false,
        error: "missing_parameters",
      });
    }

    const user = await Usuario.findById(usuarioId).select("analysisUnlock");

    if (!user) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    const now = Date.now();
    const activeUntil =
      user.analysisUnlock?.activeUntil?.getTime?.() || 0;

    // 🛡️ Idempotencia
    if (activeUntil > now) {
      return res.json({
        ok: true,
        unlocked: true,
        activeUntil: new Date(activeUntil),
        alreadyActive: true,
      });
    }

    // --------------------------------------------------
    // 💳 CREATE CHARGE (Culqi)
    // --------------------------------------------------
    const chargeRes = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CULQI_PRIVATE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 100, // USD 1
        currency_code: "USD",
        email: "user@buholex.com",
        source_id: culqiToken,
        description: "LitisBot · Análisis jurídico avanzado (24h)",
      }),
    });

    const charge = await chargeRes.json();

    if (!charge || charge.outcome?.type !== "venta_exitosa") {
      return res.status(402).json({
        ok: false,
        error: "payment_failed",
      });
    }

    // --------------------------------------------------
    // 🔓 UNLOCK
    // --------------------------------------------------
    const newActiveUntil = new Date(now + UNLOCK_DURATION_MS);

    user.analysisUnlock = {
      activeUntil: newActiveUntil,
      source: "culqi_payment",
      unlockedAt: new Date(now),
      chargeId: charge.id,
    };

    await user.save();

    return res.json({
      ok: true,
      unlocked: true,
      activeUntil: newActiveUntil,
      alreadyActive: false,
    });
  } catch (err) {
    console.error("🔥 [unlock-analysis]", err);
    return res.status(500).json({
      ok: false,
      error: "unlock_failed",
    });
  }
}
