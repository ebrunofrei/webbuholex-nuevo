# Jurisprudence Architecture

Arquitectura efectiva del dominio de Jurisprudencia basada en evidencia del código real.

## Estructura de Datos
- **jurisprudence_internal:** Separación arquitectónica.
- **jurisprudence_public:** Esquema / proyección pública.
- **PostgreSQL FTS:** CODE_AVAILABLE

## Componentes y Gateways
- **repository/gateway:** Acceso a datos abstraído.
- **public read/search boundary:** Barrera implementada y probada (`TESTED`).
- **feature switch/fail-closed behavior:** CODE_AVAILABLE / TESTED; activation is environment-controlled and separate from implementation.
- **observability:** Trazas de logs y correlation ID (CODE_AVAILABLE).

## Ingestion Pipeline
- **ingestion source record:** Dato bruto proveniente de fuente oficial.
- **canonical normalized record:** Estructura normalizada.
- **preview:** Validación en memoria.
- **exact persistibility validation:** El preview valida que el contrato canónico sea exacto antes de inserción (CODE_AVAILABLE, TESTED).
- **confirm:** Intento de persistencia final.
- **idempotency:** idempotency keys and replay semantics protect against duplicate ingestion execution; verified as independent from legal identity deduplication during J2-A.3.
- **durable duplicate protection:** enforced via deterministic `deduplication_key` database constraint; successfully rejects new-key replays with duplicate identities.
- **sourceReference:** transport-only metadata identifier accepted by the ingestion contract; it is not mapped into `JurisprudenceNewRecord` and is NOT a persisted canonical field.
- **resolutionNumber nullable:** CODE_AVAILABLE.
- **migration 0029:** APPLIED_TO_STAGING (verificado durante J2-A.3).

## Publication Pipeline
- **publication command:** valida la versión fuente y crea durablemente execution/event/idempotency/outbox; no escribe por sí mismo la proyección pública.
- **outbox:** Registro transaccional del intento.
- **processor single-message:** Procesa los registros pendientes uno a uno.
- **batch processing:** Soporte implementado (CODE_AVAILABLE).
- **protected cron host:** CODE_AVAILABLE / TESTED; schedule/activation is a separate operational concern.
- **recovery/dead-letter linkage:** Enlaces para fallos de publicación.
- **public exposure barrier:** Barrera final de validación (CODE_AVAILABLE).

## Estado de Fases
- **J1-G.1–G.7:** CLOSED según evidencia disponible.
- **J1-G.8:** CLOSED según evidencia de cierre del runtime freeze; esto no implica activación en Production.
- **J2:** ACTIVE
- **J2-A.2J:** CLOSED/COMMITTED
- **J2-A.2K-F2:** CLOSED/COMMITTED
- **J2-A.3:** CLOSED/COMMITTED (persistencia física, idempotencia y semántica validada en STAGING).
