# Contrato de análisis jurisprudencial

No procesa archivos ni usa modelos de IA en esta fase.

## Entrada futura

- texto o referencia privada a documento, nunca ambos de forma ambigua;
- resumen opcional del caso del usuario;
- consentimiento de privacidad;
- identificador de solicitud.

## Salida estructurada

1. Órgano, expediente, fecha, materia y jurisdicción.
2. Antecedentes relevantes.
3. Problema jurídico.
4. Fundamentos.
5. Ratio decidendi.
6. Obiter dicta.
7. Normas aplicables.
8. Voto mayoritario, concurrente o discrepante.
9. Comparación con el caso del usuario.
10. Límites de aplicabilidad.
11. Fuentes y citas verificadas.
12. Nivel de confianza y campos no resueltos.

## Prevención de citas inventadas

`jurisprudenceAnalysisResultSchema` rechaza toda cita que no esté marcada como verificada o cuyo `sourceId` no corresponda a una fuente verificada incluida en el mismo resultado. Un campo no comprobado debe ir en `unresolvedFields`, no completarse por inferencia.
