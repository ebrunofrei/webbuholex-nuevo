# Contrato del workflow editorial — Fase 11.H

## Propósito

Gestionar expedientes internos de revisión sobre una versión concreta de un registro jurisprudencial privado. El workflow no publica ni modifica directamente el registro.

## Operaciones

- `openCase`: comprueba existencia y versión, impide otro expediente activo y registra apertura idempotente.
- `assignReview`: asigna revisión editorial o verificación jurídica mediante referencias opacas distintas.
- `recordObservation` / `resolveObservation`: conserva observaciones cerradas y su historial.
- `recordDecision`: admite exclusivamente `request_changes`, `editorial_approved`, `legal_verification_rejected`, `legal_verification_approved` y `close_without_approval`.
- `evaluatePublication`: reutiliza 11.A/11.C y registra un resultado informativo con autorización y ejecución siempre falsas.
- `synchronizeCase`: detecta cambio de versión y marca el expediente como superado.
- `closeCase`, `getCase`, `getHistory` y `close`: lifecycle explícito.

## Estados

`open`, `changes_requested`, `editorially_approved`, `legally_rejected`, `legally_verified`, `verified_for_publication_evaluation`, `superseded` y `closed_without_approval`.

El estado se deriva de la versión, decisiones, observaciones, evaluación, expiración y cierre. `verified_for_publication_evaluation` no significa autorizado ni publicado.

## Validación contractual

Todos los comandos usan Zod estricto. Se rechazan campos desconocidos, estados directos, decisiones inexistentes, referencias personales, fechas o versiones inválidas e idempotency keys deficientes. No se aceptan roles, headers o identidades del navegador.

## Separación de funciones

La decisión editorial requiere la asignación editorial; la jurídica requiere la asignación jurídica. Ambas referencias deben ser distintas. Una asignación no equivale a aprobación.

## Mapeo conceptual de permisos

- apertura, observaciones y decisión editorial → `jurisprudence.internal.update_editorial`;
- asignación/decisión jurídica → `jurisprudence.internal.update_source`;
- evaluación → `jurisprudence.internal.evaluate_publication`;
- historial → `jurisprudence.internal.read_history`.

El mapeo no acredita autorización real; no existe principal autenticado en 11.H.

## Validación oficial

El contrato quedó aprobado en la copia externa física y equivalente con 18/18 hashes coincidentes. Typecheck y suite focalizada finalizaron con código 0; lint, typecheck, test y build completos también finalizaron con código 0. Vitest registró 40 archivos y 533 pruebas aprobadas, incluidas 32 pruebas específicas de 11.H; Next.js generó 46/46 páginas.

La validación confirma el workflow editorial, no una autorización para publicar. `publicationAuthorizationGranted`, `publicationExecuted`, `publicationAuthorizationReady` y `publicationExecutionReady` permanecen en `false`.
