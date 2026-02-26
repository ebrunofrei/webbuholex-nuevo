import express from "express";
import { processLegalText } from "../../brain/legal/pipeline/LegalProcessingPipeline.js";

const router = express.Router();

/**
 * POST /api/legal/process
 * Body: { text: string, options?: {...} }
 */
router.post("/process", async (req, res) => {
  try {
    const { text, options = {} } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "missing_text" });
    }

    const result = await processLegalText(text, {
      courtReview: true,
      enableJurisprudence: false,            // 🔒 en orden: (1) no
      useEmbeddingsForContradictions: false, // 🔒 en orden: (2) todavía no
      ...options,
    });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("[legal/process]", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;