# Historial, idempotencia y concurrencia editorial — Fase 11.H

## Historial inmutable

Cada mutación agrega un evento con id, secuencia, fecha, actor opaco, versión de registro, versión de expediente y payload estructurado mínimo. Resolver una observación no elimina el evento de creación. Sustituir una decisión conserva la anterior en el historial.

## Versiones

El expediente nace en versión 1 y cada evento confirmado incrementa una unidad. Toda mutación exige `expectedCaseVersion` y `expectedRecordVersion`. Los adaptadores comparan la versión del expediente al escribir y SQLite usa una transacción `BEGIN IMMEDIATE` para expediente, evento e idempotencia.

## Invalidación

Cuando `JurisprudenceInternalApi` informa una versión distinta, el workflow agrega `case_superseded`, conserva decisiones anteriores y bloquea nuevas mutaciones. No copia aprobaciones a un expediente nuevo.

## Idempotencia

La huella del comando excluye requestId y fecha de solicitud, pero incluye operación, actor y contenido semántico. Una repetición idéntica devuelve el resultado almacenado; reutilizar la clave con otro comando produce `IDEMPOTENCY_CONFLICT`.

## Lifecycle

El cierre del workflow es idempotente y cierra el puerto editorial y la API interna una sola vez. Las operaciones posteriores reciben `RESOURCE_CLOSED`. SQLite temporal usa WAL local, cierre explícito y limpieza con reintentos en Windows.

## Validación oficial

La equivalencia entre memoria, SQLite `:memory:` y SQLite temporal quedó aprobada. La suite comprobó creación, decisiones, historial inmutable, control optimista, idempotencia, invalidación por nueva versión, cierre, reapertura, recuperación y limpieza. Los dos controles focalizados y los cuatro comandos completos finalizaron con código 0 en una copia física con 18/18 hashes coincidentes.
