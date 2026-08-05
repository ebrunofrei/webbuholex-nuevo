# Fase 11.N — Auditoría de la experiencia pública de búsqueda

## Antecedente

La Fase 11.M permanece cerrada como `approved`, con 45 archivos de prueba, 688 pruebas, 26 casos específicos y 46/46 páginas. Ese cierre no se reabre ni se interpreta como conexión pública.

Antes de 11.N, `/jurisprudencia` era una presentación institucional sin gateway de lectura. No existían `app/api`, archivos `route.ts`, autenticación real, Auth0 ni conexión productiva al índice. React y React DOM permanecían en 19.1.1. Sitemap y robots no habilitaban indexación jurisprudencial productiva.

## Cambio acotado

11.N incorpora una superficie visible con formulario, filtros, orden, paginación y estados públicos controlados. La página depende exclusivamente de `JurisprudencePublicSearchGateway`. La implementación operativa por defecto es `UnconfiguredJurisprudencePublicSearchGateway`, que no abre repositorios, SQLite, conexiones, variables de entorno ni red.

No se creó la ruta de detalle `/jurisprudencia/[slug]`: se difiere para evitar ampliar la superficie antes de que exista un gateway productivo autorizado. El contrato `getBySlug` queda preparado y probado con fixtures.

## Preservaciones

- No existen datos o fuentes jurisprudenciales reales.
- No se crearon endpoints, `app/api` ni `route.ts`.
- No se conectaron repositorios, servicios de 11.G–11.M, sitemap, robots, analytics o red.
- No se instalaron dependencias ni Auth0.
- No se modificaron `package.json`, `pnpm-lock.yaml`, middleware, productos o servicios.
- SRV-WEB-001 permanece sin pago inmediato y no publicado.
- BL-LEG-CON-001 permanece en vista previa editorial, sin autorización ni descarga pública.

## Diagnóstico local

El único intento de `pnpm lint` no inició ESLint por:

`EPERM: operation not permitted, open '...\\node_modules\\eslint\\bin\\eslint.js'`

El intento diagnóstico de typecheck tampoco inició TypeScript por EPERM al abrir `node_modules\\typescript\\bin\\tsc`. El lanzador focalizado informó que `vitest` no estaba disponible como comando. No se modificaron ACL, permisos o dependencias y no se repitió lint.

## Validación técnica oficial externa

La validación oficial se ejecutó sobre la copia externa:
`C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-n`

Resultados oficiales:

- Validación focalizada de 11.N:
  - Typecheck: código 0.
  - Vitest: código 0.
  - Test Files 1 passed (1).
  - Tests 21 passed (21).

- Validación de regresión focalizada adicional:
  - Test Files 4 passed (4).
  - Tests 47 passed (47).
  - Suites incluidas:
    - tests/phase-10-g-responsive.test.tsx
    - tests/phase-10-b-visual-contract.test.ts
    - tests/phase-11-a-jurisprudence-domain.test.ts
    - tests/phase-11-n-jurisprudence-public-search-experience.test.tsx

- Validación global definitiva:
  - pnpm lint: código 0.
  - pnpm typecheck: código 0.
  - pnpm test: código 0.
  - pnpm build: código 0.
  - Test Files 46 passed (46).
  - Tests 709 passed (709).
  - Suite 11.N: 21 pruebas aprobadas.
  - Generating static pages (46/46).
  - Compiled successfully.

## Advertencias no bloqueantes registradas

- ExperimentalWarning: SQLite is an experimental feature and might change at any time.
- HTMLCanvasElement.getContext() not implemented in jsdom.
- LinkComponent updates not wrapped in act(...).

`outputCompletelyWarningFree: false`

El único intento de `pnpm lint` no inició ESLint por:

`EPERM: operation not permitted, open '...\\node_modules\\eslint\\bin\\eslint.js'`

El intento diagnóstico de typecheck tampoco inició TypeScript por EPERM al abrir `node_modules\\typescript\\bin\\tsc`. El lanzador focalizado informó que `vitest` no estaba disponible como comando. No se modificaron ACL, permisos o dependencias y no se repitió lint.
