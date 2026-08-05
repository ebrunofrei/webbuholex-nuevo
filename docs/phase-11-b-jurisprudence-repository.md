# Fase 11.B — Repositorio jurisprudencial

## Propósito y alcance

La capa persiste el `JurisprudenceRecord` interno completo y conserva versiones, identidad externa e idempotencia. No decide publicación: toda exposición sigue pasando por `isJurisprudenceRecordPublic` y las proyecciones de 11.A.

## Puerto

`JurisprudenceRepository` define:

- `findById`, `findBySlug`, `findByExternalIdentity`;
- `create`, `update`;
- `list`, `search`, `count`, `existsByExternalIdentity`;
- `getVersionHistory`;
- `close`.

No hay lectura ilimitada, consulta SQL cruda, borrado general, `save` ambiguo ni upsert implícito.

## Adaptadores

### Memoria

Referencia de comportamiento para pruebas. Clona entradas/salidas, aplica validación, deduplicación, idempotencia, versión, filtros, orden y paginación. `clearForTests` no forma parte del puerto.

### SQLite

Persistencia local real con `node:sqlite`. Usa tablas de registro, historial e idempotencia; transacciones; placeholders; claves foráneas; WAL para archivo y cierre explícito. Se probó además mediante cierre y reapertura de un archivo temporal.

No es todavía la base definitiva de producción.

## Identidad

La identidad interna es generada por el repositorio. La externa combina componentes verificables y conserva sus originales dentro del payload. La normalización usa Unicode NFC, espacios controlados y mayúsculas, sin borrar símbolos jurídicos.

El título no participa en la deduplicación. Una coincidencia parcial se reporta como posible colisión para revisión, no se fusiona automáticamente.

## Escrituras seguras

Crear y actualizar validan objetos estrictos con Zod. La creación recibe el registro completo sin identidad interna; el repositorio añade id, versión 1 y timestamps. La actualización reemplaza un registro completo, exige versión esperada y distingue cambio editorial o de fuente.

El repositorio no asigna `published`, `verified` ni autoridad. Persiste los estados suministrados por un comando válido; los fixtures comienzan `draft`, `private`, `unverified` y `unknown`.

## Versionado e historial

Cada estado confirmado tiene snapshot. La actualización conserva `createdAt`, avanza `updatedAt` y versiona de `n` a `n + 1`. Un esperado obsoleto produce `VERSION_CONFLICT`.

## Consultas

Filtros: expediente, resolución, institución, materia, estado editorial, publicación, verificación y rango de emisión. Órdenes: emisión o actualización, ascendente o descendente, siempre con desempate por id.

`pageSize` está limitado a 50. `q` hace coincidencia determinista sobre texto normalizado; no es full-text, ranking ni búsqueda semántica.

## Errores

`VALIDATION_ERROR`, `DUPLICATE_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `VERSION_CONFLICT`, `NOT_FOUND`, `PERSISTENCE_ERROR` y `RESOURCE_CLOSED`. Los detalles técnicos se conservan internamente y el mensaje público futuro no debe filtrar el error del driver.

## Transacciones y recursos

Registro, versión e idempotencia se escriben en una sola transacción. Toda excepción revierte. Las conexiones son propiedad de la instancia, sin singleton global, y deben cerrarse.

## Fixtures, seguridad y privacidad

Los fixtures están en `tests/helpers`, usan marcadores `TEST-NO-REAL`, no contienen personas ni expedientes reales y nunca se importan desde UI o datos públicos. No hay documentos ni base en `public/`.

SQLite y sus archivos WAL/SHM/journal están ignorados. No hay credenciales, datos reales, PDFs o rutas compartidas del usuario.

## Limitaciones y plan para 11.C

- definir PostgreSQL o continuidad de SQLite según despliegue;
- elegir migrador y estrategia operativa;
- añadir auditoría de actor cuando existan roles;
- resolver colisiones manuales;
- definir backup, cifrado y retención;
- diseñar servicio de aplicación interno sobre el puerto;
- mantener API y UI desconectadas hasta una fase autorizada.
