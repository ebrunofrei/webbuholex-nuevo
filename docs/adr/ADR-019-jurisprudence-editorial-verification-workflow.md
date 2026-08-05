# ADR-019 — Workflow de revisión editorial y verificación jurídica

- Estado: aprobado — workflow editorial y verificación jurídica validados; sin autorización ni ejecución de publicación.
- Fecha: 2026-07-29

## Contexto

11.G produce registros privados mediante preview y confirmación. Superar ingesta estructural no acredita revisión editorial, verificación jurídica, autorización o publicación.

## Decisión

Se adopta `JurisprudenceEditorialWorkflow`, inyectado con `JurisprudenceInternalApi` y un puerto editorial propio. El expediente conserva asignaciones, observaciones, decisiones, evaluación e historial sin reutilizar campos del registro canónico.

Los adaptadores iniciales son memoria y SQLite local. Cada commit de SQLite actualiza expediente, agrega evento y registra idempotencia en una sola transacción.

## Separación y default deny

Las revisiones editorial y jurídica requieren asignaciones y actores opacos distintos. No se aceptan roles en comandos ni identidad desde headers. Una aprobación aislada, la ausencia de duplicados o una evaluación favorable no bastan.

## Estados y versión

El estado es derivado y calificado. Para alcanzar `verified_for_publication_evaluation` se requieren decisiones vigentes sobre la misma versión, separación de actores, cero observaciones bloqueantes, expediente activo y evaluación registrada. Un cambio de versión agrega un evento `case_superseded`; no transfiere aprobaciones.

## Publicación

La evaluación reutiliza la API interna y bloqueos de 11.A, pero devuelve `publicationAuthorizationGranted: false` y `publicationExecuted: false`. No existe comando `publish`, bypass, endpoint o UI. `publicationAuthorizationReady` y `publicationExecutionReady` permanecen siempre falsos.

## Logging y privacidad

Los logs contienen solo requestId, operación, código, referencia opaca del expediente, versiones y timestamp. Excluyen actores, observaciones, contenido jurídico, headers, credenciales, rutas, SQL, stack y mensajes del driver.

## Consecuencias

- El historial editorial es independiente del historial del registro.
- La concurrencia se controla en ambos niveles.
- La fase prueba memoria y SQLite sin autenticar usuarios ni montar rutas.
- La aprobación del workflow no equivale a autorización para publicar.

## Alternativas descartadas

- Aprobar durante ingesta: mezcla controles independientes.
- Guardar flags en el registro: crea autoridad mutable sin historial propio.
- Un único booleano `approved`: no distingue revisión, verificación y publicación.
- Reutilizar aprobaciones entre versiones: elimina trazabilidad.
- Montar HTTP o UI: no existe autenticación real.

## Decisiones diferidas

Gobierno de fuentes y expediente de publicación corresponden a una fase posterior. La proyección pública y conexión del buscador permanecen posteriores y sujetas a autorización. Este cierre no inicia 11.I.

## Validación oficial de Fase 11.H

La decisión fue validada sobre `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-h`, una copia externa física y materialmente equivalente:

- 18/18 archivos obligatorios presentes y hashes SHA-256 coincidentes;
- `node_modules` físico, sin junction ni enlace;
- typecheck focalizado y suite focalizada con código 0;
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` con código 0;
- 40 archivos de prueba aprobados;
- 533 pruebas aprobadas;
- 32 pruebas específicas de 11.H;
- 46/46 páginas generadas.

Se registraron como no bloqueantes la advertencia experimental de SQLite y los avisos conocidos de jsdom canvas y `act(...)`. El árbol original había presentado `EPERM` antes de iniciar ESLint; no se modificaron ACL, permisos ni dependencias.

La aprobación valida el workflow editorial y la verificación jurídica. Se mantienen la ausencia de rutas y UI, la separación entre ambas revisiones, la invalidación de decisiones ante una nueva versión y la prohibición de autorizar o ejecutar publicación.
