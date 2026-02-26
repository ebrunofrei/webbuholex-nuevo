import express from "express";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const router = express.Router();

router.post("/analysis-docx", async (req, res) => {
  try {
    const result = req.body;

    const {
      score,
      predictiveOutcome,
      meta,
    } = result;

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [

            new Paragraph({
              text: "ANÁLISIS JURÍDICO ESTRUCTURAL",
              heading: HeadingLevel.HEADING_1,
            }),

            new Paragraph(""),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Fecha: ${new Date().toLocaleDateString()}`,
                }),
              ],
            }),

            new Paragraph(""),

            new Paragraph({
              text: `Score estructural: ${score}`,
            }),

            new Paragraph({
              text: `Probabilidad de éxito: ${(predictiveOutcome.probabilidadExito * 100).toFixed(0)}%`,
            }),

            new Paragraph({
              text: `Nivel de riesgo: ${predictiveOutcome.nivelRiesgo}`,
            }),

            new Paragraph({
              text: `Perfil judicial probable: ${predictiveOutcome.perfilJuezProbable}`,
            }),

            new Paragraph(""),

            new Paragraph({
              text: "FACTORES CRÍTICOS DETECTADOS",
              heading: HeadingLevel.HEADING_2,
            }),

            ...(predictiveOutcome.factoresClave || []).map(
              (f) =>
                new Paragraph({
                  text: `• ${f}`,
                })
            ),

            new Paragraph(""),

            new Paragraph({
              text: `Modelo predictivo: ${predictiveOutcome.modeloVersion}`,
            }),

          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Analisis_Juridico_Estructural.docx"
    );

    res.send(buffer);

  } catch (error) {
    console.error("Error generando DOCX:", error);
    res.status(500).json({ error: "Error generando documento" });
  }
});

export default router;