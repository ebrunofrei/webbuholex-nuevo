import express from "express";
import ChatMessage from "../models/ChatMessage.js";
import { embedText } from "../services/semantic/embeddingService.js";

const router = express.Router();

router.post("/search", async (req, res) => {
  const { caseId, query, limit = 6 } = req.body || {};
  if (!caseId || !query) {
    return res.status(400).json({ error: "caseId y query requeridos" });
  }

  const qEmb = await embedText(query);
  if (!qEmb) return res.json({ results: [] });

  const results = await ChatMessage.aggregate([
    {
      $vectorSearch: {
        index: "case_semantic",
        path: "embedding",
        queryVector: qEmb,
        numCandidates: 100,
        limit,
        filter: { caseId },
      },
    },
    {
      $project: {
        _id: 1,
        role: 1,
        content: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  res.json({ ok: true, results });
});

export default router;
