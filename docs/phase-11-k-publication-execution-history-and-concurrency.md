# Historial, idempotencia y concurrencia — Fase 11.K

Ejecución, retiro y supersesión agregan eventos append-only. Ninguna operación elimina retrospectivamente ejecuciones, proyecciones o eventos.

Cada mutación exige idempotency key y versión esperada. Una repetición idéntica devuelve el resultado almacenado; una clave reutilizada con otro contenido produce conflicto. Solo puede existir una ejecución vigente por registro y versión.

Ejecución, evento, resultado idempotente y proyección se persisten atómicamente. SQLite utiliza una transacción y evita estados parciales. Los adaptadores en memoria, SQLite `:memory:` y SQLite temporal fueron aprobados.

La validación comprobó cierre idempotente, reapertura, recuperación, limpieza segura y ausencia de recursos bloqueados. Historial, idempotencia y concurrencia quedaron aprobados dentro de las 35 pruebas específicas y 644 globales.
