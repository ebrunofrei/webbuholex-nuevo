# Fase 10.C — Separación real de acceso

## Implementado

- Portal `/` conservado.
- Ecosistema público con `PublicHeader`.
- `/espacio` definido como presentación pública del espacio inteligente.
- `/iniciar-sesion` con `AuthHeader` mínimo.
- `/app` y nueve subrutas reservadas con shell privado independiente.
- Middleware y guard de layout sin proveedor configurado.
- `returnTo` limitado a rutas internas de `/app`.
- Correo corporativo centralizado en `siteConfig.contact.email`.
- Panel institucional sin datos bancarios.
- Políticas no aprobadas fuera del sitemap y no disponibles fuera de desarrollo.

## Estado actual

Autenticación: `not_configured`. No existen credenciales, OAuth, magic links, usuarios, sesiones persistentes, pagos, cuotas, consumo, historial, almacenamiento privado ni proveedor ficticio.

## Estado comercial preservado

BL-LEG-CON-001 continúa en `editorial_preview`, con precio y moneda nulos, licencia pendiente y publicación no autorizada.

## Validación

### Herramientas oficiales

Se ejecutaron en el orden solicitado:

1. `pnpm lint`: no inició ESLint. Windows devolvió `EPERM` al abrir `node_modules/eslint/bin/eslint.js`.
2. `pnpm typecheck`: no inició TypeScript. Windows devolvió `EPERM` al abrir `node_modules/typescript/bin/tsc`.
3. `pnpm test`: no inició Vitest. Windows devolvió `EPERM` al abrir `node_modules/vitest/vitest.mjs`.
4. `pnpm build`: no inició Next.js. Windows devolvió `EPERM` al abrir `node_modules/next/dist/bin/next`.

No se cambiaron permisos, dependencias, `package.json` ni el lockfile. Estos resultados no validan ni invalidan el código porque las herramientas no llegaron a ejecutarse.

### Comprobaciones alternativas

- diez rutas privadas presentes;
- `middleware` aplicado a `/app/:path*` y guard redundante en el layout;
- un único literal de correo corporativo, ubicado en `lib/site-config.ts`;
- cero datos bancarios en las superficies y configuraciones revisadas;
- cero enlaces desde superficies públicas hacia `/app`;
- cero usos explícitos de `any` en los archivos creados para 10.C;
- estado comercial de BL-LEG-CON-001 preservado: `editorial_preview`, precio y moneda nulos, licencia pendiente y publicación no autorizada.

### Servidor y auditoría visual

`pnpm dev --port 3000` tampoco inició Next.js por `EPERM` sobre `node_modules/next/dist/bin/next`. La comprobación del navegador devolvió `ERR_CONNECTION_REFUSED` para `http://localhost:3000`. Por ello no se realizaron capturas ni se declara una auditoría visual o de consola inexistente.

## Archivos creados

- `types/navigation.ts`
- `types/auth.ts`
- `data/navigation.ts`
- `lib/auth/session.ts`
- `lib/auth/return-to.ts`
- `lib/auth/workspace-guard.ts`
- `middleware.ts`
- `components/public-header.tsx`
- `components/auth-header.tsx`
- `components/workspace/workspace-navigation.tsx`
- `components/workspace/workspace-header.tsx`
- `components/workspace/workspace-shell.tsx`
- `components/workspace/workspace-placeholder.tsx`
- `components/workspace/workspace-shell.module.css`
- `components/portal/intelligent-space-overview.tsx`
- `app/app/layout.tsx`
- `app/app/page.tsx`
- `app/app/asistente/page.tsx`
- `app/app/proyectos/page.tsx`
- `app/app/jurisprudencia/page.tsx`
- `app/app/documentos/page.tsx`
- `app/app/automatizaciones/page.tsx`
- `app/app/biblioteca/page.tsx`
- `app/app/productos/page.tsx`
- `app/app/servicios/page.tsx`
- `app/app/cuenta/page.tsx`
- `tests/workspace-guard.test.ts`
- `tests/access-separation.test.tsx`
- `tests/corporate-contact.test.ts`
- `docs/auth-boundary-architecture.md`
- `docs/public-workspace-navigation.md`
- `docs/workspace-route-guard.md`
- `docs/phase-10-c-access-separation.md`

## Archivos modificados

- `app/layout.tsx`
- `app/espacio/page.tsx`
- `app/iniciar-sesion/page.tsx`
- `app/contacto/page.tsx`
- `app/consulta-profesional/page.tsx`
- `app/privacidad/page.tsx`
- `app/terminos/page.tsx`
- `app/sitemap.ts`
- `components/site-frame.tsx`
- `components/site-header.tsx`
- `components/site-footer.tsx`
- `components/portal/future-access-page.tsx`
- `components/portal/future-access-page.module.css`
- `components/portal/legal-transparency-panel.tsx`
- `app/globals.css`
- `lib/site-config.ts`
- `tests/site-frame.test.tsx`
- `tests/site-header.test.tsx`
- `docs/access-boundaries.md`

## No implementado

No se configuraron autenticación, credenciales, OAuth, magic links, sesiones persistentes, usuarios, pagos, cuotas, historial, almacenamiento privado, modelos externos ni publicación.

## Continuidad en Fase 10.D

El refinamiento visual y el catálogo de servicios reutilizan `PublicHeader`, `AuthHeader` y el guard de `/app`. No se modificó la frontera de autenticación ni se expusieron enlaces privados.
