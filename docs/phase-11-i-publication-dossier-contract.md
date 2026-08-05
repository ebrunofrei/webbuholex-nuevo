# Contrato del expediente de publicación — Fase 11.I

## Agregado separado

`JurisprudencePublicationDossier` referencia un registro y versión, un expediente editorial y versión, vínculos de fuente y evaluaciones de procedencia, integridad, derechos, privacidad y proyección pública. No duplica el contenido jurisprudencial.

## Estados

`draft`, `under_review`, `blocked`, `complete_for_authorization_evaluation`, `superseded` y `closed`.

No existen estados `authorized`, `published`, `public` o `publication_executed`.

## Evaluación discriminada

El resultado puede ser `incomplete`, `ready_for_authorization_evaluation` o `rejected`. Incluso el resultado máximo conserva:

- `publicationAuthorizationGranted: false`;
- `publicationExecuted: false`.

`complete_for_authorization_evaluation` significa documentación técnica completa para una decisión institucional futura. No cambia `publicationStatus`, no autoriza publicación y no la ejecuta.

## Requisitos concurrentes

Se requiere expediente editorial vigente con estado `verified_for_publication_evaluation`, misma versión, ausencia de observaciones bloqueantes, vínculo vigente, procedencia verificada, integridad sin conflicto, derechos compatibles, privacidad y proyección aprobadas, hashes registrados y referencia institucional futura.

## Operaciones

Registro y sustitución de fuentes, vínculo versionado, apertura, evaluaciones separadas, evaluación consolidada, sincronización por versión, lectura, historial y cierre. No existe operación de autorización o publicación.

## Validación oficial

El expediente interno quedó aprobado con memoria, SQLite `:memory:` y SQLite temporal. La validación oficial registró 41 archivos de prueba, 570 pruebas, 37 pruebas específicas de 11.I y 46 de 46 páginas. `complete_for_authorization_evaluation` continúa siendo el estado máximo y no equivale a autorización institucional, publicación ni despliegue.
