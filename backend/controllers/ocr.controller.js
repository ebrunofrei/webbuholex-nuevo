import { createWorker } from "tesseract.js";

export async function extractOCR(req, res) {
  let worker;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se recibió ningún archivo",
      });
    }

    worker = await createWorker({
      logger: m => console.log("🧠 OCR:", m.status),
    });

    await worker.loadLanguage("spa+eng");
    await worker.initialize("spa+eng");

    const { data } = await worker.recognize(req.file.buffer);

    const text = data?.text ?? "";

    return res.json({
      success: true,
      text,
      meta: {
        length: text.length,
        confidence: data?.confidence ?? null,
        language: "spa+eng",
        engine: "tesseract",
        extractedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("❌ OCR error:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno procesando OCR",
    });
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
  }
}
