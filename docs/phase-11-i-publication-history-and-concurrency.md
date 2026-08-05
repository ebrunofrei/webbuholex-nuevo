# Historial, idempotencia y concurrencia — Fase 11.I

Cada mutación del expediente agrega un evento inmutable con secuencia, versión de registro y versión de expediente. Ninguna evaluación anterior se edita o elimina.

Las mutaciones exigen `expectedVersion` e idempotency key. Una repetición idéntica devuelve el resultado persistido; reutilizar la clave con contenido distinto produce conflicto. Memoria y SQLite clonan los resultados para impedir referencias mutables.

SQLite persiste expediente, evento e idempotencia en una transacción `BEGIN IMMEDIATE`. El archivo temporal usa WAL, cierre explícito, reapertura y limpieza con reintentos.

Una nueva versión del registro marca el expediente como `superseded`. No hereda vínculos, evaluaciones ni decisiones anteriores.

## Validación oficial

El historial append-only, la idempotencia, el control optimista y la invalidación entre versiones quedaron aprobados en memoria, SQLite `:memory:` y SQLite temporal. La validación externa física y equivalente aprobó los controles focalizados y completos, con 41 archivos, 570 pruebas, 37 pruebas específicas de 11.I y 46 de 46 páginas generadas.
