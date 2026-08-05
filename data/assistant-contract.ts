import type { AssistantRiskLevel, ProfessionalAttentionType } from "@/types/domain";

export const assistantFunctionalContract = {
  purpose: "Ordenar una consulta jurídica inicial, explicar criterios generales y orientar hacia el siguiente paso adecuado.",
  jurisdiction: "Perú como jurisdicción inicial, siempre confirmada por el usuario antes de orientar.",
  initialMatters: ["civil", "laboral", "familia", "empresarial", "administrativo", "constitucional"] as const,
  minimumData: ["materia", "jurisdicción", "hechos esenciales", "objetivo del usuario", "existencia de plazo"] as const,
  clarificationQuestions: [
    "¿En qué país, ciudad o jurisdicción ocurre el asunto?",
    "¿Existe una fecha límite, audiencia o notificación reciente?",
    "¿Qué resultado o decisión necesita tomar?",
    "¿Qué documentos o comunicaciones respaldan los hechos?",
  ] as const,
  urgencyCriteria: ["vencimiento próximo", "audiencia o diligencia", "privación de libertad", "violencia o riesgo personal", "medida cautelar", "pérdida inmediata de un derecho"] as const,
  warnings: ["No sustituye la evaluación profesional.", "No garantiza resultados.", "No debe recibir contraseñas, datos bancarios ni documentos de identidad completos."] as const,
  responseSections: ["alcance", "hechos comprendidos", "información faltante", "orientación inicial", "fuentes verificadas", "límites", "siguientes pasos", "derivación"] as const,
  retention: "Pendiente de aprobación: no se retendrá contenido hasta definir finalidad, plazo y mecanismo de eliminación.",
  traceability: "Cada futura sesión usará sessionId, traceId, versión de contrato, consentimiento y registro de derivación sin incluir contenido innecesario.",
} as const;

export const referralRules: ReadonlyArray<{ risk: AssistantRiskLevel; attention: ProfessionalAttentionType; reason: string }> = [
  { risk: "critical", attention: "representation_or_defense", reason: "Riesgo personal, penal o pérdida inmediata de derechos." },
  { risk: "urgent", attention: "video_consultation", reason: "Existe plazo, audiencia o actuación próxima." },
  { risk: "sensitive", attention: "document_review", reason: "La orientación depende del contenido y vigencia de documentos concretos." },
];
