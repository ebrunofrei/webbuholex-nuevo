# Publication Pipeline

El pipeline de publicación implementa un flujo controlado para evaluar y, cuando corresponde, materializar la exposición pública de registros de Jurisprudencia.

## Producción
`Production = FROZEN`
La existencia del host o processor en código no equivale a cron activado ni a publicación habilitada en Production.

## Flujo
`publication command -> outbox -> processor -> public projection`

## Componentes y Responsabilidades

- **Publication command:**
  - `validates source/version and publication preconditions`
  - `creates durable execution/event/idempotency/outbox state`
  - `does NOT itself materialize the public projection`

- **Outbox:**
  - Durable handoff entre el publication command y el processor, creado dentro del flujo transaccional correspondiente.

- **Single-message Processor:**
  - `processes one eligible outbox message`
  - `validates current publication blockers/state`
  - `materializes the public projection only when allowed`

- **Batch Processing:**
  - `bounded batch processing with controlled concurrency`

- **Recovery / Dead-letter:**
  - `migration 0028 provides durable recovery linkage (fully physically applied in STAGING and journal reconciled)`
  - `a recovery handoff references the prior outbox item`
  - `durable constraints prevent duplicate recovery linkage where defined`

- **Public Exposure Barrier:**
  - `public exposure barrier = CODE_AVAILABLE / TESTED`
  - Verificado en STAGING durante J2-A.3: los tres pilotos oficiales no se publican automáticamente y permanecen privados. La auditoría posterior J2-WEB-HYGIENE-A1 determinó que las 17 filas entonces existentes en `jurisprudence_public.published_records` eran fixtures de prueba. El saneamiento controlado removió esas 17 proyecciones y 21 filas `pending` de `publish_projection` con payloads parciales/malformados de batch E2E (`attempts = 0`), asociadas únicamente al fixture sintético `19bdd9bd-6a3b-4a16-b021-0699c790deab`. Se preservaron los estados terminales del outbox, recovery, executions/events y los registros canónicos internos. La proyección pública de STAGING quedó en 0 registros y ningún piloto oficial fue publicado.
- **Cron Host:**
  - `protected cron host = CODE_AVAILABLE / TESTED`
  - `activation/schedule = separate operational concern`
  - `Authorization: Bearer <JURISPRUDENCE_PUBLICATION_CRON_SECRET>`

- **Feature Switches:**
  - `CODE_AVAILABLE`, `ENABLED` y `ACTIVATED` representan estados conceptualmente distintos.
  - La presencia del código no implica que la capacidad esté habilitada o activada.
  - El comportamiento auditado es fail-closed cuando la configuración requerida no habilita la capacidad.
  - Production permanece FROZEN; no se afirma `ENABLED` ni `ACTIVATED` en Production.

- **Observability:**
  - Structured events/logging and correlation identifiers are available on the audited J1-G.7 publication runtime surfaces.
