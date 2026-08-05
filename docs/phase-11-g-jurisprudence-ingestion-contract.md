# Contrato del pipeline jurisprudencial — Fase 11.G

Estado: aprobado y validado para fuentes locales controladas y ficticias; no habilitado para ingesta productiva.

## Propósito y alcance

El contrato admite únicamente lotes locales controlados de registros estructurados ficticios. Cada lote contiene contexto interno, items, procedencia, checksum, acción solicitada e idempotency key. `application/json` es el único media type de esta fase.

## Estados discriminados

Los resultados por item son `rejected`, `duplicate_in_batch`, `duplicate_existing`, `conflict`, `preview_ready`, `persisted` o `unchanged`. El lote es `accepted` o `rejected`. No se usa `null` para representar fallos heterogéneos.

## Preview

`previewBatch(input)` valida, aplica la barrera preventiva de privacidad, normaliza, calcula las tres referencias de identidad, detecta duplicados y guarda un preview efímero. No crea registros, historial o versiones; tampoco consume la idempotencia de creación.

## Confirmación

`confirmPreview(input)` exige `previewId`, fingerprint vigente e idempotency key. Una actualización exige además `expectedVersion`. La persistencia se delega exclusivamente a `JurisprudenceInternalApi`. Una repetición idéntica devuelve el resultado persistido sin una segunda escritura.

## Límites configurables

- TTL predeterminado del preview: 15 minutos.
- Límite predeterminado del lote: 50 items; máximo contractual: 100.
- Límite predeterminado por item: 256 KiB.
- Sin rutas absolutas, archivos físicos, body de red o variables de entorno.

## Seguridad y privacidad

Se rechazan campos desconocidos y nombres asociados a identidad personal, contacto, credenciales, secretos, rutas, SQL y stack. Esta barrera es preventiva para fixtures; no acredita anonimización ni revisión legal. Los logs omiten registros, contenido jurídico, checksums completos, paths, SQL y errores internos.

## Publicación

La entrada debe continuar como borrador, privada y no verificada. La ingesta nunca publica, despublica, verifica o autoriza exposición. El pipeline no implementa operación de publicación.

## Validación

El contrato y su integración con memoria, SQLite `:memory:` y SQLite temporal quedaron aprobados dentro de una validación global de 39 archivos y 501 pruebas, incluidas 35 pruebas específicas de 11.G. Esta validación no amplía las fuentes admitidas ni autoriza rutas, UI o datos reales.
