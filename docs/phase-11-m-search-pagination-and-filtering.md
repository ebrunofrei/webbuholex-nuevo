# Paginación y filtros 11.M

Estado: aprobado. La consulta estricta admite texto simple, institución, órgano, materia, tipo, fechas, expediente y resolución. Usa offset estable y límite máximo 50. No acepta regex, SQL o sintaxis avanzada.

## Corrección validada

Cómo estaba: el transform devolvía directamente el objeto de Zod y podía materializar `text`, `institutionName`, `issuingBody`, `matter`, `resolutionType`, `caseNumber`, `resolutionNumber`, `issuedFrom` o `issuedTo` con `undefined` bajo `exactOptionalPropertyTypes`.

Cómo quedó: el objeto se reconstruye mediante spreads condicionales; cada propiedad se incluye con string válido o se omite físicamente. Se conservaron strict schema, rango de fechas, filtros, orden, offset, limit y paginación.

Las regresiones validaron ausencia y conservación individual/conjunta de fechas, rechazo de rango invertido con path `["filters", "issuedTo"]` y rechazo de campos desconocidos. No se usaron `any`, casts, non-null assertions o supresiones.
