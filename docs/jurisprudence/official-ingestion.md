# Official Ingestion

Documentación del proceso de ingestión oficial de registros jurisprudenciales.

## Identidad y Fuentes
- `sourceReference` = identificador opaco de fuente dentro del dominio.
- `source URL` = URL oficial real del documento.
- `local filesystem path` = operational input only; never legal identity.
- No se debe tratar `sourceReference` como URL.

## Procedencia / Hashes
Durante el piloto pueden existir valores distintos que cumplen finalidades distintas:
- `original artifact hash`
- `extracted official-text hash`
- `final local_json payload hash`

Los valores de `checksum`, `byteSize`, y `mediaType` del source contract deben corresponder exactamente al objeto/bytes que el contrato real define. No se asume ni se inventa un algoritmo o self-reference semantics sin verificar la implementación.

## Principios Congelados
- `official text may exist privately before publication`
- `official content presence != publication authorization`

## Fases de Ingestión

1. **Fuentes Oficiales:** Obtención inicial.
2. **Metadata Básica:** Cálculo preciso.
3. **Normalize:** Transformación del dato crudo.
4. **Preview:** Validación en memoria.
   - `preview_ready means: normalized record conforms to exact canonical persistence contract`
   - `jurisprudenceNewRecordSchema` es el contrato persistible exacto.
5. **Canonical Validation:** Verificación de las reglas de negocio estrictas.
   - `ingestion omission -> canonical resolutionNumber = null` (cuando no existe un número de resolución independiente).
6. **Confirm / Persist:** Inserción en la base de datos interna.
   - `preview_ready does NOT guarantee database write success` (debido a: concurrency, version conflicts, database availability, infrastructure failure).
7. **Idempotency y Duplicate Prevention:**
   Documentado mediante la aplicación en conjunto de:
   - `idempotency key`
   - `replay semantics`
   - `legal/source identity duplicate checks`
   - `repository checks`
   - `durable database constraints`

## Estado de Publicación Inicial
Al ingresar al sistema, el registro asume el contrato real validado en código: `draft`, `private`, `unverified`, y `publicationAllowed = false`.

## Pilotos Actuales
Los únicos tres pilotos oficiales vigentes documentados son:
- `00001-2010-PI/TC`
- `00005-2010-PI/TC`
- `00002-2010-PI/TC`

Respecto al entorno:
- `J2-A.3 CLOSED / COMMITTED`
- `physical persistence in STAGING VERIFIED`
- Tras J2-WEB-HYGIENE-A1, la proyección pública de STAGING está intencionalmente vacía (0 registros), y estos tres pilotos oficiales se mantienen privados/internos (`publicationAllowed = false`, `draft`, `unverified`).
