# ADR-020 — Gobierno de fuentes y expediente de publicación

- Estado: aprobado — gobierno de fuentes y expediente interno de publicación validados; sin autorización ni ejecución de publicación.
- Fecha: 2026-07-29

## Contexto

11.G ingiere registros privados y 11.H permite revisión editorial y verificación jurídica. Ninguna de esas capacidades acredita procedencia, derechos, privacidad o autorización institucional de publicación.

## Decisión

Se adopta un registro gobernado de fuentes, vínculos explícitos por versión y un agregado `JurisprudencePublicationDossier`, coordinados por `JurisprudencePublicationGovernanceService`. La persistencia editorial se mantiene separada del registro canónico y del expediente de 11.H.

## Reglas

- default deny para derechos y exposición;
- checksum distinto de autenticidad jurídica;
- fuente secundaria distinta de fuente primaria;
- vínculos y evaluaciones no se heredan entre versiones;
- eventos append-only, idempotencia y control optimista;
- memoria y SQLite solo para pruebas locales;
- logging sin contenido jurídico, datos personales, hashes completos, rutas, SQL o stack.

## Corte de autoridad

**Expediente completo ≠ publicación autorizada.**

**Publicación autorizada ≠ publicación ejecutada.**

**Publicación ejecutada ≠ despliegue del sitio.**

El máximo estado de 11.I es `complete_for_authorization_evaluation`. `publicationAuthorizationGranted` y `publicationExecuted` permanecen falsos.

## Consecuencias

No se montan rutas ni UI, no se incorpora autenticación real y `/jurisprudencia` permanece desconectada. Fuentes reales, políticas productivas, decisión institucional, autorización y ejecución se difieren.

## Alternativas descartadas

- reutilizar campos del registro jurisprudencial;
- considerar el workflow editorial como autorización;
- publicar por ausencia de bloqueos;
- aceptar fuentes secundarias como primarias automáticamente;
- resolver conflictos mediante overwrite;
- montar endpoints antes del gobierno productivo.

## Validación oficial

La validación oficial se ejecutó sobre la copia externa física y materialmente equivalente `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-i`: 21 de 21 archivos obligatorios estuvieron presentes, sus 21 hashes SHA-256 coincidieron y `node_modules` fue una carpeta física.

El typecheck focalizado y la suite focalizada terminaron con código 0; esta última aprobó 37 pruebas. Los comandos completos `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` terminaron con código 0. El resultado global fue de 41 archivos de prueba, 570 pruebas y 46 de 46 páginas generadas.

Se registraron como advertencias no bloqueantes el carácter experimental de SQLite, `HTMLCanvasElement.getContext()` no implementado en jsdom y actualizaciones de `LinkComponent` no envueltas en `act(...)`. El árbol original mantuvo el antecedente `EPERM` al abrir el ejecutable de ESLint; no se modificaron ACL, permisos ni dependencias.

Esta aprobación valida el gobierno interno y el expediente técnico. Se mantiene que expediente completo ≠ publicación autorizada, publicación autorizada ≠ publicación ejecutada y publicación ejecutada ≠ despliegue. No se montan rutas ni UI, no se reutilizan aprobaciones entre versiones y la revisión editorial permanece separada de la verificación jurídica.
