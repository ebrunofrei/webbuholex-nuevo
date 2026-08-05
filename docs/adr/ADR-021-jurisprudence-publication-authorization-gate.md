# ADR-021 — Puerta institucional de autorización de publicación jurisprudencial

- Estado: aprobado — puerta institucional de autorización validada; sin decisión institucional real ni ejecución de publicación.

## Contexto y decisión

El expediente completo de 11.I no representa una autorización institucional. Se adopta un agregado separado de autorización, un servicio coordinador y un puerto de persistencia con adaptadores en memoria y SQLite local. Las únicas decisiones son `authorize`, `reject`, `defer` y `revoke`; la evaluación favorable no persiste una autorización.

## Corte de autoridad

Expediente completo ≠ autorización institucional.

Autorización institucional vigente ≠ publicación ejecutada.

Publicación ejecutada ≠ despliegue del sitio.

11.J no contiene una decisión institucional real. Las autorizaciones creadas por la suite son exclusivamente ficticias y locales a pruebas.

## Garantías

- default deny y condiciones obligatorias cerradas;
- asignación editorial y jurídica previa, con actores opacos distintos;
- una autorización ficticia vigente por registro y versión;
- expiración, revocación y supersesión explícitas;
- historial append-only, idempotencia y control optimista;
- ninguna herencia entre versiones;
- logging sin contenido jurídico, razones completas, datos personales, SQL o secretos;
- ninguna operación `publish`, `executePublication` o `mountRoute`;
- ausencia de endpoints, UI, autenticación real y conexión con `/jurisprudencia`.

## Validación oficial

La validación se ejecutó sobre la copia externa física y equivalente `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-j`, con 21 archivos obligatorios previamente sincronizados y `node_modules` físico.

El archivo corregido `tests\phase-11-j-jurisprudence-publication-authorization-gate.test.ts` coincidió entre fuente y destino con SHA-256 `A039AC9B51F6432E0DD6B10013E01AF98CA27641B47038BF92FE13A237DB2436`.

- Typecheck focalizado: código 0.
- Suite focalizada: 39 pruebas, código 0.
- Lint, typecheck, test y build: código 0.
- Resultado global: 42 archivos y 609 pruebas aprobadas.
- Next.js: 46/46 páginas generadas.
- `EBUSY`: no reproducido después de la corrección.

Se observaron advertencias no bloqueantes de SQLite experimental, `HTMLCanvasElement.getContext()` en jsdom y actualizaciones de `LinkComponent` no envueltas en `act(...)`.

## Consecuencias y decisiones diferidas

La decisión institucional real, autenticación, infraestructura productiva, ejecutor técnico, rutas, UI, publicación y despliegue quedan diferidos. SQLite continúa siendo local y experimental. La aprobación valida la puerta técnica, no concede autorización ni habilita publicación.
