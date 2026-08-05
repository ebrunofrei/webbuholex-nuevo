# ADR-022 — Ejecución técnica reversible y proyección jurisprudencial

- Estado: aprobado — ejecución técnica reversible y proyección jurisprudencial interna validadas; sin ejecución real, exposición pública ni despliegue.

## Contexto y decisión

11.J representa una puerta de autorización ficticia, pero no ejecuta publicación. Se adopta un agregado separado de ejecución, un servicio dependiente de puertos, persistencia transaccional y un puerto de lectura de proyecciones.

La transacción almacena conjuntamente ejecución, evento, idempotencia y proyección. La proyección usa una lista explícita de campos y permanece interna.

## Separaciones obligatorias

Expediente completo ≠ autorización institucional.

Autorización institucional vigente ≠ ejecución técnica.

Ejecución técnica ≠ exposición pública en /jurisprudencia.

Exposición pública ≠ despliegue del sitio.

Revocación institucional ≠ retiro técnico.

Retiro técnico ≠ eliminación del historial.

## Validación oficial

La validación se ejecutó sobre `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-k`, una copia física con `node_modules` físico, sin junction ni enlace simbólico.

- 25/25 archivos obligatorios presentes y hashes coincidentes.
- Archivo corregido con SHA-256 coincidente `494BA7921F2ED728B7488C5B0A47E9CE7ED97146FC0EA46BEB8F1598A952A32C`.
- Typecheck y Vitest focalizados: código 0.
- Suite focalizada: 35 pruebas aprobadas.
- Lint, typecheck, test y build: código 0.
- Resultado global: 43 archivos y 644 pruebas aprobadas.
- Next.js: 46/46 páginas generadas.

La corrección actualizó el registro a versión 2 antes de superseder la autorización anterior. `authorization_superseded` quedó validado y `VERSION_CONFLICT` conserva una regresión independiente. No se modificaron servicios productivos.

Se observaron advertencias no bloqueantes de SQLite experimental, `HTMLCanvasElement.getContext()` en jsdom y actualizaciones de `LinkComponent` no envueltas en `act(...)`.

## Consecuencias

La aprobación valida el mecanismo técnico reversible. No concede una decisión o autorización institucional real, no ejecuta una publicación real, no expone `/jurisprudencia` y no despliega el sitio.

Permanecen diferidos autenticación, rutas, UI, exposición, indexación, infraestructura productiva, publicación y despliegue.
