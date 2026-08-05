# ADR-012 — Persistencia y repositorio jurisprudencial

- Estado: aceptado para Fase 11.B
- Fecha: 2026-07-29

## Contexto

11.A aprobó el registro canónico y las reglas de exposición pública. 11.B necesita persistencia verificable sin acoplar dominio, API o frontend a una tecnología y sin añadir un servicio externo.

## Decisión

Se adopta un puerto asíncrono `JurisprudenceRepository`, un adaptador de referencia en memoria y un adaptador SQLite local basado en `node:sqlite`. SQLite es local/de pruebas; PostgreSQL continúa como candidato para producción.

No se añaden dependencias. El módulo `node:sqlite` pertenece a Node 22.16 y emite una advertencia experimental que debe conservarse en los informes.

## Puerto

El puerto expone búsquedas por id, slug e identidad externa; creación idempotente; actualización con versión esperada; listado y búsqueda determinista paginados; conteo; existencia; historial y cierre. No expone `rawQuery`, borrado masivo ni lecturas ilimitadas.

## Identidad y deduplicación

La clave explicable conserva etiquetas y valores normalizados de tipo de fuente, identificador documental, institución, expediente, resolución y fecha. Usa NFC, colapso de espacios y mayúsculas; no elimina puntuación. `compareJurisprudenceIdentity` diferencia coincidencia exacta, colisión posible y diferencia.

La clave no es un hash y puede auditarse. Un checksum documental sigue siendo evidencia de integridad, no identidad jurídica.

## Idempotencia

Cada creación exige una clave de idempotencia. Repetir la misma clave y el mismo registro devuelve la creación previa. Reutilizarla con otro contenido produce `IDEMPOTENCY_CONFLICT`. La tabla de idempotencia se actualiza en la misma transacción que registro e historial.

## Versionado y concurrencia

- versión inicial 1;
- actualización completa y validada, nunca patch parcial;
- `expectedVersion` obligatorio;
- incremento exacto en uno;
- `createdAt` estable y `updatedAt` estrictamente posterior;
- `UPDATE ... WHERE id = ? AND record_version = ?`;
- conflicto estructurado si otra escritura cambió la versión;
- snapshot de cada versión con clase `created`, `editorial_update` o `source_update`.

No existe `last-write-wins` silencioso.

## Modelo físico y migraciones

La migración contractual 001 crea:

- `jurisprudence_records`;
- `jurisprudence_record_versions`;
- `jurisprudence_idempotency`;
- índices de identidad, fuente, expediente, resolución, institución/materia/fecha y estados/actualización.

El registro completo se guarda como JSON canónico. Las columnas indexables se derivan del mismo registro y se vuelven a comparar al leer, evitando divergencias silenciosas. La migración es idempotente mediante `IF NOT EXISTS`.

## Transacciones

SQLite usa `BEGIN IMMEDIATE`, `COMMIT` y `ROLLBACK` para creación, actualización e historial. Se activan claves foráneas y `busy_timeout`. Los archivos usan WAL; `:memory:` no.

## Consultas

Las consultas usan placeholders y cláusulas seleccionadas desde enumeraciones controladas. No concatenan valores de usuario. La búsqueda `q` es una coincidencia determinista `LIKE` escapada sobre `normalized_search_text`; no es full-text ni relevancia semántica. Todo orden añade `id` como desempate.

## Estrategia de pruebas

- mismo contrato observable para memoria y SQLite;
- SQLite `:memory:` para aislamiento rápido;
- archivo temporal real, cierre y reapertura para probar persistencia;
- limpieza explícita de recursos y archivos temporales;
- fixtures exclusivamente en `tests/helpers`.

## Alternativas

- PostgreSQL: preferible para producción, diferido por ausencia de infraestructura y decisión de despliegue.
- SQLite con dependencia externa: innecesario mientras el runtime aprobado ofrece el módulo nativo.
- MongoDB: peor ajuste para consistencia e índices compuestos de este dominio.
- JSON: insuficiente como base.
- solo memoria: insuficiente para declarar persistencia.

## Compatibilidad y consecuencias

El puerto permite reemplazar SQLite sin cambiar consumidores. El adaptador local prueba persistencia real en Node/Windows y CI con Node compatible. La advertencia experimental y el modelo de concurrencia impiden designarlo como base definitiva de producción.

## Seguridad y mantenimiento

No hay credenciales ni conexión externa. Las consultas son parametrizadas. Las rutas se inyectan y se rechaza cualquier archivo dentro de `public/`. El archivo y sus auxiliares se ignoran en Git. No hay datos reales ni seed de producción.

## Riesgos y decisiones diferidas

- estabilización futura de `node:sqlite`;
- PostgreSQL, ORM/query builder y migrador de producción;
- directorio operativo, backup, cifrado, retención y monitoreo;
- política de datos personales;
- roles editoriales y auditoría de actor;
- importación, API y búsqueda full-text;
- tratamiento de colisiones dudosas mediante revisión manual.

## Límites

Este ADR no autoriza API, frontend conectado, ingesta, scraping, archivos, autenticación, publicación ni despliegue.
