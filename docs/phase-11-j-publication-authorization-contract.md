# Contrato de autorización institucional — Fase 11.J

## Decisiones y estados

Las únicas decisiones son `authorize`, `reject`, `defer` y `revoke`. Los estados cerrados son `not_evaluated`, `deferred`, `rejected`, `authorized`, `revoked` y `superseded`.

Los comandos son estrictos y rechazan propiedades desconocidas, referencias no opacas, versiones inválidas, fechas no ISO, listas duplicadas, condiciones incompletas y propiedades de bypass o ejecución.

## Garantías

`authorize` exige todas las condiciones cerradas de gobierno de fuente, vigencia editorial y jurídica, derechos, privacidad, proyección, titular institucional, alcance, vigencia y revocación. Una autorización ficticia interna puede devolver `publicationAuthorizationGranted: true`, pero siempre mantiene `publicationExecuted: false` y no modifica el registro jurisprudencial.

El rechazo exige razones; el diferimiento exige bloqueos cerrados; la revocación exige autorización vigente, versión esperada, referencia institucional y razón. Revocación, expiración y supersesión conservan el historial. Una nueva versión no hereda asignaciones, decisiones ni autorización.

## Cierre validado

La suite oficial de 39 pruebas confirmó los contratos y la regresión `ASSIGNMENT_REQUIRED` para actores no asignados. La validación global aprobó 42 archivos, 609 pruebas y 46/46 páginas.

La aprobación valida el contrato técnico. `institutionalDecisionPresent`, `realPublicationAuthorizationExists`, `publicationAuthorizationGranted`, `publicationAuthorizationCurrent` y `publicationExecuted` permanecen en `false` para el estado real del proyecto.
