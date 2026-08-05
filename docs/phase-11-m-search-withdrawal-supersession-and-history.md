# Retiro, supersesión e historial 11.M

Estado: aprobado. Un documento retirado deja de ser consultable sin borrar historial. Una nueva versión supersede el documento anterior, no hereda indexación y debe prepararse e indexarse expresamente.

Cada mutación conserva documento, evento e idempotencia atómicamente. Se validaron historial append-only, conflicto de clave, control optimista, cierre, reapertura y limpieza en memoria, SQLite `:memory:` y SQLite temporal.
