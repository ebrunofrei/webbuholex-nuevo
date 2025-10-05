import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import crypto from "crypto";
import OpenAI from "openai";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 86400 }); // 24h
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function translateLibre(text, targetLang = "es") {
  const res = await axios.post("https://libretranslate.com/translate", {
    q: text,
    source: "auto",
    target: targetLang,
    format: "text",
  });
  return res.data.translatedText;
}

async function translateOpenAI(text, targetLang = "es") {
  const prompt = `Traduce al ${targetLang} manteniendo el sentido legal y periodístico:\n\n${text}`;
  const res = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });
  return res.output[0].content[0].text.trim();
}

// --- POST /api/traducir ---
router.post("/", async (req, res) => {
  try {
    const { text, targetLang = "es" } = req.body;
    if (!text) return res.status(400).json({ error: "Falta texto" });

    const hash = crypto.createHash("md5").update(text + targetLang).digest("hex");
    const cached = cache.get(hash);
    if (cached) return res.json({ cached: true, translated: cached });

    let translated;
    try {
      translated = await translateLibre(text, targetLang);
    } catch (err) {
      console.warn("⚠️ LibreTranslate falló, intentando con OpenAI...");
      if (!openai) throw new Error("No hay traductor disponible");
      translated = await translateOpenAI(text, targetLang);
    }

    cache.set(hash, translated);
    res.json({ cached: false, translated });
  } catch (err) {
    console.error("❌ Error al traducir:", err.message);
    res.status(500).json({ error: "Error en traducción" });
  }
});

export default router;
