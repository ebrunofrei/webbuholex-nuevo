# Auditoría de autorización de publicación — Fase 11.J

## Estado auditado

La Fase 11.I permanece aprobada, pero su expediente completo no constituye autorización. Antes y después de 11.J permanecen en `false` la decisión institucional real, la autorización real vigente, la ejecución de publicación, la autenticación real, los endpoints, la UI, la publicación y el despliegue.

Se confirmó la ausencia de `app/api`, `route.ts`, operaciones `publish`, `executePublication` y `mountRoute`. `/jurisprudencia` sigue desconectada; Auth0 no está instalado; React y React DOM permanecen en 19.1.1. No existen fuentes o registros jurídicos reales, scraping, OCR, IA, RAG o embeddings.

## Brecha resuelta

11.J incorpora una puerta interna y no montada para evaluar, autorizar, rechazar, diferir y revocar decisiones ficticias de prueba con default deny, vigencia, expiración, supersesión, historial append-only, idempotencia y concurrencia optimista.

No incorpora una decisión institucional real ni un ejecutor de publicación.

## Corrección y validación oficial

La suite preparaba las asignaciones `revisor-editorial-ficticio` y `verificador-juridico-ficticio`, pero intentaba decidir con `actor-editorial-ficticio-11j`. El workflow de 11.H respondió correctamente `ASSIGNMENT_REQUIRED`. La corrección hizo que cada asignación preceda a su decisión, con actores distintos y coincidentes con la asignación; la regresión de actor no asignado se conserva.

La copia física `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-j` validó el archivo corregido con SHA-256 coincidente `A039AC9B51F6432E0DD6B10013E01AF98CA27641B47038BF92FE13A237DB2436`. Aprobaron 39 pruebas focalizadas, 42 archivos y 609 pruebas globales, cuatro comandos completos con código 0 y 46/46 páginas.

El antecedente EPERM del árbol original se conserva; no se modificaron ACL, permisos ni dependencias.
