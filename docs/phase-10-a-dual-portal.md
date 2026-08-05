# Fase 10.A — Portal dual

> Actualización de Fase 10.B: se conservó la arquitectura dual y se corrigió su composición. El búho ocupa ahora una columna propia; los accesos completos mantienen CTA visibles, se retiró la numeración sin función y el panel legal utiliza un único mensaje institucional. `/explorar/` y `/iniciar-sesion/` redujeron lenguaje técnico sin alterar las fronteras de acceso.

Fecha: 28 de julio de 2026

## Implementado

- Portal dual minimalista en `/`.
- Zona pública completa en `/explorar`.
- Preparación de autenticación en `/iniciar-sesion`.
- Preparación del espacio inteligente en `/espacio`.
- Tres fronteras de acceso tipadas.
- Panel inferior accesible de transparencia y marco legal.
- Modelo futuro de cookies y eventos sin envío.
- Libro de Reclamaciones identificado como pendiente y sin enlace funcional simulado.

## Panel legal

El panel usa diálogo modal, bloqueo de scroll, cierre con botón y Escape, ciclo de foco y devolución del foco al control inicial. No contiene contratos privados, documentos personales, rutas, hashes o datos bancarios.

## No conectado

No se implementaron login, pagos, compra, descarga, analítica, publicidad, service workers, FCM, notificaciones ni servicios externos.

## Estado comercial

`BL-LEG-CON-001` conserva `approved`, `editorial_preview`, `published: false` en metadatos, precio y moneda nulos, licencia pendiente y autorización de publicación negativa.

## Validación

### Comandos oficiales

Se ejecutaron, en orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Todos se detuvieron antes de validar el código por `EPERM: operation not permitted` al abrir:

- `node_modules/eslint/bin/eslint.js`
- `node_modules/typescript/bin/tsc`
- `node_modules/vitest/vitest.mjs`
- `node_modules/next/dist/bin/next`

El intento `pnpm dev --port 3000` fue bloqueado en `node_modules/next/dist/bin/next`. El navegador confirmó `ERR_CONNECTION_REFUSED` en `localhost:3000`. No se modificaron dependencias, permisos, `package.json` ni el lockfile.

### Comprobaciones alternativas

- Las cuatro rutas existen físicamente.
- La raíz declara únicamente dos destinos: `/explorar/` y `/iniciar-sesion/`.
- El marco global oculta cabecera y footer exclusivamente en `/`.
- Las tres fronteras conservan las combinaciones correctas de login y pago.
- Los 13 eventos permanecen en datos tipados, sin emisor.
- Solo las cookies necesarias figuran activas.
- Cero usos explícitos de `any` en los archivos de la fase.
- Los tres CSS Modules tienen llaves balanceadas y reglas móviles.
- No existen `createRoot`, ReactDOM, Vite, service worker, FCM, push, Google Analytics, Meta Pixel o llamadas de analítica.
- No existen archivos del producto dentro de `public/`.
- El Libro de Reclamaciones no aparece como enlace activo.
- El producto mantiene `approved`, `editorial_preview`, `published: false`, precio y moneda nulos, licencia pendiente y publicación no autorizada.

### Auditoría visual y capturas

No fue posible iniciar la aplicación ni abrir las rutas locales. En consecuencia, no se afirma auditoría visual, interacción real del diálogo, revisión de consola ni responsive, y no se generaron capturas de la Fase 10.A. Las pruebas automatizadas para foco, Escape, scroll lock y retorno de foco fueron añadidas, pero Vitest no llegó a ejecutarlas por `EPERM`.

## Archivos

### Creados

- `app/explorar/page.tsx`
- `app/iniciar-sesion/page.tsx`
- `app/espacio/page.tsx`
- `components/site-frame.tsx`
- `components/portal/dual-portal.tsx`
- `components/portal/legal-transparency-panel.tsx`
- `components/portal/future-access-page.tsx`
- `components/portal/dual-portal.module.css`
- `components/portal/future-access-page.module.css`
- `components/explore/public-explore.tsx`
- `components/explore/public-explore.module.css`
- `types/access.ts`
- `data/access-boundaries.ts`
- `data/analytics-events.ts`
- `tests/dual-portal.test.tsx`
- `tests/access-boundaries.test.ts`
- `tests/portal-routes.test.tsx`
- `tests/site-frame.test.tsx`
- `docs/access-boundaries.md`
- `docs/public-private-product-architecture.md`
- `docs/analytics-event-model.md`
- `docs/phase-10-a-dual-portal.md`

### Modificados

- `app/layout.tsx`
- `app/page.tsx`
- `app/sitemap.ts`
- `app/globals.css`
- `components/site-footer.tsx`
- `components/home/home-experience.tsx`
- `lib/site-config.ts`
- `tests/routes.test.ts`
- `tests/accessibility.test.tsx`
- `README.md`

No publicado. No desplegado. Sin autenticación, pagos, compra, descarga o analítica externa.
