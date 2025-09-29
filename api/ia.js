// api/ia.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      historial = [],
      usuarioId = "invitado",
      userEmail = "",
      modo = "general",
      materia = "general",
      idioma = "es",
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Falta el prompt en la solicitud" });
    }

    // 🧠 Clasificación automática de materias jurídicas
    const materias = [
      { key: "civil", keywords: ["contrato", "obligación", "propiedad", "arrendamiento"] },
      { key: "penal", keywords: ["delito", "acusación", "pena", "condena"] },
      { key: "laboral", keywords: ["trabajador", "empleador", "despido", "sindicato"] },
      { key: "constitucional", keywords: ["derechos fundamentales", "amparo", "hábeas corpus", "tribunal constitucional"] },
      { key: "administrativo", keywords: ["procedimiento administrativo", "silencio administrativo", "SBN", "OSCE"] },
      { key: "tributario", keywords: ["impuesto", "SUNAT", "tributo", "declaración jurada"] },
      { key: "comercial", keywords: ["sociedad anónima", "empresa", "accionista", "factoring"] },
      { key: "procesal", keywords: ["demanda", "apelación", "casación", "sentencia", "proceso judicial"] },
      { key: "internacional", keywords: ["corte interamericana", "tratado", "derecho internacional", "extradición"] },
      { key: "informatico", keywords: ["ciberseguridad", "protección de datos", "habeas data", "delitos informáticos"] },
    ];

    let materiaDetectada = materia;
    const texto = prompt.toLowerCase();
    for (const m of materias) {
      if (m.keywords.some((k) => texto.includes(k.toLowerCase()))) {
        materiaDetectada = m.key;
        break;
      }
    }

    // 🎯 Configuración dinámica según modo
    let systemPrompt = "Eres un asistente útil y generalista.";
    if (modo === "juridico") {
      systemPrompt = `Eres un abogado experto en derecho ${materiaDetectada}.
      Responde siempre con fundamento jurídico, citando artículos de la ley peruana, doctrina y jurisprudencia relevante.
      Si corresponde, analiza la lógica jurídica y su relación con principios constitucionales.`;
    } else if (modo === "investigacion") {
      systemPrompt = `Eres un investigador académico en derecho.
      Ayuda a plantear hipótesis, variables, objetivos y marcos teóricos para tesis o investigaciones jurídicas.
      Usa metodología científica y referencias doctrinales.`;
    }

    // 🔥 Llamada a OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...historial,
        { role: "user", content: prompt },
      ],
      temperature: modo === "juridico" ? 0.3 : 0.7,
      max_tokens: 1200,
    });

    const respuesta = completion.choices[0]?.message?.content || "";

    // 📝 Logging
    console.log(
      `[IA.js] Usuario: ${usuarioId} (${userEmail}) → modo: ${modo}, materia: ${materiaDetectada}`
    );

    return res.status(200).json({
      respuesta,
      modoDetectado: modo,
      materiaDetectada,
      idioma,
    });
  } catch (err) {
    console.error("❌ Error en /api/ia:", err);
    return res.status(500).json({ error: "Error interno en IA" });
  }
}
