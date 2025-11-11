// backend/routes/export.js
import express from "express";
import { exportDocx } from "../services/export/docxExporter.js";
import { exportXlsx } from "../services/export/xlsxExporter.js";
import { exportPdf } from "../services/export/pdfExporter.js";

const router = express.Router();

/**
 * POST /api/export
 * body: { format: "docx"|"xlsx"|"pdf", title?, content, citations?[] }
 */
router.post("/", async (req, res) => {
  try {
    const { format = "docx", title = "Informe LitisBot", content = "", citations = [] } = req.body || {};
    let file;
    if (format === "docx") file = await exportDocx({ title, content, citations });
    else if (format === "xlsx") file = await exportXlsx({ title, content, citations });
    else if (format === "pdf") file = await exportPdf({ title, content, citations });
    else return res.status(400).json({ ok: false, error: "Formato inválido" });

    res.setHeader("Content-Disposition", `attachment; filename="${slug(title)}.${format}"`);
    res.setHeader("Content-Type", mime(format));
    return res.send(file);
  } catch (e) {
    console.error("export error:", e);
    res.status(500).json({ ok: false, error: "No se pudo exportar" });
  }
});

function slug(s) {
  return String(s || "documento").toLowerCase().replace(/[^\w\-]+/g, "-").replace(/\-+/g, "-");
}
function mime(ext) {
  return ext === "pdf" ? "application/pdf"
    : ext === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export default router;
