# Historial, idempotencia y concurrencia — Fase 11.J

Cada decisión crea un caso y un evento append-only. Revocación y supersesión agregan eventos posteriores; no editan ni eliminan retrospectivamente el historial.

Las mutaciones usan idempotency key y versión esperada. Una repetición idéntica devuelve el mismo resultado observable; una clave reutilizada con otro contenido produce conflicto. Solo puede existir una autorización ficticia vigente por registro y versión.

Los adaptadores en memoria y SQLite fueron validados. SQLite conserva caso, evento e idempotencia en una transacción, admite cierre idempotente y reapertura del archivo temporal.

El `EBUSY` no volvió a reproducirse: el composition root se cerró antes de reabrir o eliminar, la conexión reabierta se cerró antes de limpiar y la limpieza se ejecutó incluso tras un fallo intermedio. No quedaron archivos SQLite auxiliares ni directorios `buholex-11j-*`; solo se eliminó el residual previo `buholex-11j-vjP3Ne`.

La suite oficial aprobó 39 casos específicos. La expiración, revocación y supersesión conservan el historial, y una versión nueva no hereda asignaciones, decisiones ni autorización.
