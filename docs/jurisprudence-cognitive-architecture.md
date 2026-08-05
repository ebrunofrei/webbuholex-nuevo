# Arquitectura cognitiva de jurisprudencia

La jurisprudencia se modela como fuente cognitiva del Asistente Legal, no como una lista documental. El flujo contractual es: consulta, clasificación jurídica, recuperación oficial, lectura estructurada, extracción de fundamentos, comparación, respuesta con citas y acceso a la fuente oficial.

## Separación semántica

Toda respuesta distingue cinco orígenes: contenido oficial, resumen del sistema, inferencia jurídica, evaluación de aplicabilidad y limitaciones. Una inferencia nunca puede rotularse como criterio oficial. Una regla verificada necesita una cita verificada con documento, páginas y URL oficial.

## Contratos centrales

`types/jurisprudence.ts` define instituciones, documentos, secciones, problemas jurídicos, holdings, citas, consultas, resultados y respuestas. `lib/schemas/jurisprudence.ts` valida paginación, fuentes y correspondencia de citas. `lib/jurisprudence-guards.ts` retorna errores estructurados y bloqueantes.

No existe una colección de resoluciones de demostración. Los ejemplos de interfaz describen intenciones de búsqueda y nunca números, expedientes o criterios ficticios.

## Controles

- No se atribuye el Tribunal Constitucional al Poder Judicial.
- No se confunde doctrina con resolución.
- No se afirma vigencia sin verificación.
- No se omiten votos identificados.
- No se extrapola aplicabilidad automáticamente.
- No se exponen documentos privados, rutas ni metadatos internos.
- No se reproduce una resolución completa cuando bastan fundamentos citados.
