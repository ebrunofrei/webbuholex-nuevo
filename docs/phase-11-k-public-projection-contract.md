# Contrato de proyección pública interna — Fase 11.K

La proyección se construye determinísticamente desde una lista explícita de campos aprobados. No reutiliza ciegamente el registro canónico.

Se excluyen notas internas, actores, observaciones, decisiones completas, razones privadas, datos personales no aprobados, hashes, rutas, custodia, SQL, stack, tokens, secretos y headers.

Sus estados son `generated`, `active_internal`, `withdrawn` y `superseded`. No existen estados `public_live`, `deployed`, `indexed` o `externally_available`.

La validación oficial confirmó la versión y vínculos exactos, construcción determinista y ausencia de campos internos. En el estado global `realPublicationExecutionPresent`, `publicProjectionExposed`, `publicProjectionReady`, `published` y `deployed` permanecen en `false`.

Ejecución técnica ≠ exposición pública en /jurisprudencia.

Exposición pública ≠ despliegue del sitio.
