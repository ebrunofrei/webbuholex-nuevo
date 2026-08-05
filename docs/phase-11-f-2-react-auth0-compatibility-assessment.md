# Fase 11.F.2 — Evaluación de compatibilidad React/Auth0

## Estado y alcance

Este expediente continúa la arquitectura aprobada en 11.F.1. Auth0 es una **recomendación condicionada pendiente de autorización**; no está seleccionado ni aprobado, y `@auth0/nextjs-auth0` no está autorizado ni instalado. No existe autenticación real ni ruta montada.

La auditoría revisó `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `middleware.ts`, `.env.example`, `.gitignore`, `types/auth.ts`, `lib/auth/session.ts`, `lib/auth/workspace-guard.ts`, `app/(auth)`, `app/(workspace)`, los contratos neutrales de 11.F.1, ADR-016, su prueba y sus entregables. Los grupos `app/(auth)` y `app/(workspace)` no existen; las superficies equivalentes encontradas son `/iniciar-sesion` y `/app`. La pantalla y el redirect existentes no constituyen autenticación.

Versiones confirmadas en manifiesto y lockfile:

- Next.js: `15.5.9`.
- React: `19.1.1`.
- React DOM: `19.1.1`.
- Node.js mínimo del proyecto: `>=22`.

## Peers del SDK recomendado

El manifiesto oficial del tag `v4.26.0` declara:

- Next: `^14.2.35 || ~15.0.7 || ~15.1.11 || ~15.2.8 || ~15.3.8 || ~15.4.10 || ~15.5.9 || ^16.0.10`.
- React: `^18.0.0 || ~19.0.1 || ~19.1.2 || ^19.2.1`.
- React DOM: `^18.0.0 || ~19.0.1 || ~19.1.2 || ^19.2.1`.

Conclusión actual:

| Componente | Proyecto | Resultado |
|---|---:|---|
| Next.js | 15.5.9 | compatible |
| React | 19.1.1 | incompatible |
| React DOM | 19.1.1 | incompatible |

Fuentes oficiales: [manifiesto del tag v4.26.0](https://raw.githubusercontent.com/auth0/nextjs-auth0/v4.26.0/package.json), [release v4.26.0](https://github.com/auth0/nextjs-auth0/releases/tag/v4.26.0) y [documentación del SDK](https://auth0.github.io/nextjs-auth0/).

## Alternativas

### A — Actualización mínima conjunta a 19.1.2

Es la ruta técnica preferente, todavía no autorizada ni ejecutada. Resuelve literalmente ambos peers de Auth0 y mantiene Next.js 15.5.9 dentro de la línea actual. React y React DOM deben cambiar juntos; actualizar solo uno produciría una instalación incoherente.

Impacto que una futura 11.F.3 tendría que validar:

- regeneración legítima del lockfile mediante pnpm;
- renderizado de servidor y cliente, hidratación y App Router;
- componentes cliente y pruebas jsdom/React Testing Library;
- build completo y 46 páginas actuales;
- posibles cambios transitivos de React/React DOM;
- compatibilidad de las librerías del proyecto.

`@types/react` 19.2.7 y `@types/react-dom` 19.2.3 ya están por encima de la versión runtime candidata. No se recomienda actualizarlos automáticamente: su necesidad debe decidirse con typecheck y pruebas después de una futura actualización autorizada.

### B — Línea 19.2.x

Es una alternativa futura con mayor superficie de cambio. Obliga a reevaluar Next.js, librerías, renderizado, tipos y regresiones sin aportar una ventaja necesaria para resolver el peer actual. No se recomienda automáticamente.

### C — Mantener 19.1.1

Mantiene el estado seguro `not_configured`. Auth0 4.26.0 no puede instalarse válidamente; autenticación y rutas continúan diferidas.

### D — Reabrir proveedor

El desfase de un parche no basta por sí solo para reabrir toda la selección: existe una ruta mínima conjunta razonable. La recomendación sigue condicionada por la autorización técnica e institucional y por el expediente contractual.

## Reglas de resolución

Quedan prohibidos `--force`, `--legacy-peer-deps` y los overrides de peers. No se ejecutó simulación del gestor: no se identificó un modo que garantizara simultáneamente cero escritura en manifiesto, lockfile, instalación y store del proyecto. Este análisis usa manifiestos oficiales y el lockfile existente.

## Conclusión

Compatibilidad evaluada: sí. Ruta mínima identificada: React y React DOM 19.1.2. Actualización autorizada: no. Actualización ejecutada: no.

La evaluación y sus contratos quedaron oficialmente validados en una copia externa física y equivalente: `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` concluyeron con código 0; se aprobaron 38 archivos, 466 pruebas, 24 pruebas específicas y 46/46 páginas. El estado del expediente es `approved_decision_package`, mientras la decisión institucional continúa siendo `defer`.

Las advertencias de SQLite experimental, jsdom y React Testing Library fueron no bloqueantes; la salida no se califica como completamente libre de advertencias. Esta validación no selecciona Auth0, no autoriza la actualización conjunta y no inicia 11.F.3.
