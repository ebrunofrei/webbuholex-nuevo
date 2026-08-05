# Contrato de ejecución técnica reversible — Fase 11.K

## Operaciones

Las operaciones internas aprobadas son `evaluate_execution`, `execute_publication`, `withdraw_publication`, `supersede_execution`, `get_execution` y `get_execution_history`.

Los esquemas estrictos rechazan campos desconocidos, referencias vacías, fechas o versiones inválidas, propiedades de bypass, publicación, despliegue y montaje de rutas.

## Evaluación y ejecución

La evaluación comprueba registro y versión, expediente editorial, dossier, fuente, integridad, derechos, privacidad, autorización, vigencia y conflictos. No persiste ni modifica registros.

La ejecución ficticia exige una autorización vigente del mismo registro y versión. Crea atómicamente ejecución, evento, idempotencia y proyección. Puede indicar `publicationExecuted: true` únicamente dentro del agregado local de prueba y conserva `publicProjectionExposed: false` y `deployed: false`.

## Validación oficial

La suite específica aprobó 35 casos. Se validaron autorizaciones inexistentes, expiradas, revocadas y `superseded`, conflictos de versión y registro, idempotencia, concurrencia y ausencia de doble ejecución activa.

No existe operación de exposición pública, endpoint o despliegue.
