# Auditoría de ingesta jurisprudencial — Fase 11.G

## Archivos revisados

Se revisaron los contratos de dominio y publicación de 11.A; el puerto, esquemas, identidad, errores, adaptadores e historial de 11.B; `JurisprudenceApplicationService`, `JurisprudenceInternalApi` y sus factories de 11.C; las fronteras no montadas de 11.D y 11.E; y el estado `defer` de 11.F. También se inspeccionaron `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `middleware.ts`, `.env.example`, `.gitignore`, `app`, `components`, `data`, `public`, `lib`, `types` y `tests`.

## Arquitectura encontrada

- Next.js 15.5.9, React/React DOM 19.1.1, Node >=22, TypeScript estricto con `exactOptionalPropertyTypes` y Zod 4.
- `JurisprudenceNewRecord` es la entrada sin campos controlados por el sistema.
- `JurisprudenceInternalApi` ya concentra creación, actualización completa, identidad externa, idempotencia, versión, historial y cierre.
- Los adaptadores en memoria y SQLite se construyen fuera de consumidores de aplicación.
- No existen `app/api`, `route.ts`, endpoints ni conexión de `/jurisprudencia` con la API interna.
- Auth0 no está instalado y sigue siendo una recomendación condicionada con decisión `defer`.
- No existía parser, contrato de lote, preview, confirmación o readiness de ingesta.

## Decisión de límites

```text
fuente local controlada
  → esquema estricto
  → normalización determinista
  → identidad y duplicados
  → preview efímero
  → confirmación explícita
  → JurisprudenceInternalApi
  → repositorio inyectado
```

El pipeline no importa adaptadores, SQL, React, rutas ni componentes. No lee el entorno, no abre SQLite al importarse y no persiste durante preview. Los fixtures solo viven en tests.

## Riesgos y controles

- **Datos personales o secretos:** barrera contractual de nombres de campos y rutas absolutas; no equivale a anonimización.
- **Duplicados:** checksum, fingerprint e identidad se conservan como señales distintas; ninguna colisión aproximada sobrescribe datos.
- **Mutación jurídica:** solo se normalizan metadatos expresamente permitidos; sumillas, fundamentos, citas y decisión conservan su redacción.
- **Publicación accidental:** los esquemas exigen borrador, privado, no verificado, `publicationAllowed: false` y ausencia de archivo.
- **Preview obsoleto:** TTL, fingerprint, idempotency key y versión esperada se verifican al confirmar.
- **Filtración por logs:** eventos con lista de campos permitidos, sin payload ni checksum completo.
- **Estado local:** previews e idempotencia de lote son de proceso; no constituyen almacenamiento productivo durable.

## Capacidades ausentes y decisiones pendientes

No hay adquisición de fuente real, scraping, OCR, archivos, malware scanning, anonimización, autenticación de operador, retención durable, almacenamiento productivo, endpoint, UI ni workflow de publicación. Estas ausencias mantienen `productionIngestionReady: false`.

## Verificación STAGING (J2-A.3)

Durante la fase J2-A.3 se ejecutó y documentó la persistencia física controlada en STAGING:

- **Persistencia Física de Pilotos:** Tres pilotos oficiales (`00001-2010-PI/TC`, `00005-2010-PI/TC`, `00002-2010-PI/TC`) fueron persistidos exitosamente y mantienen su estado: `canonicalVersion = 1`, `resolutionNumber = null`, `draft`, `private`, `unverified`, `publicationAllowed = false`, con `officialText retained`. Production = FROZEN.
- **Orquestación P1:** Se identificó y contuvo un incidente temporal de orquestación (el script temporal persistía cada ítem inmediatamente después de su `preview_ready` individual, sin esperar primero el gate global 3/3 `preview_ready` exigido para el lote). Esto no produjo corrupción de datos, duplicados ni estado canónico inválido (solo persistencia parcial inicialmente).
- **Límite Operacional (PILOT-003):** Se aplicó un override operacional offline temporal de 512 KiB exclusivamente para PILOT-003. El default global configurable se mantiene en 256 KiB (`DEFAULT_MAX_ITEM_BYTES`) y el máximo absoluto en Zod permite hasta 10 MiB, pero estos límites no fueron alterados permanentemente.
- **Same-Key Replay:** El pipeline demostró soporte exitoso de replays idempotentes con la misma llave. La operación se resolvió con `success` sin crear una segunda identidad o versión (`VERSIONING_DELTA = 0`).
- **New-Key + Same Identity:** El uso de una nueva clave de idempotencia con la misma identidad legal fue rechazado (`rejected_duplicate / DUPLICATE_CONFLICT`). Esto verificó que, en los escenarios ensayados de J2-A.3, la protección de idempotencia y la deduplicación por identidad jurídica operan como controles distintos: el same-key replay se resolvió sin nuevas escrituras durables, mientras que una nueva idempotency key con la misma identidad jurídica produjo `DUPLICATE_CONFLICT` sin crear una segunda identidad.
- **Semántica de `sourceReference`:** Quedó resuelto que `sourceReference` actúa exclusivamente como metadato de transporte y no se mapea en el registro canónico de dominio (`JurisprudenceNewRecord`), resolviéndose favorablemente el "Semantic Gate".
