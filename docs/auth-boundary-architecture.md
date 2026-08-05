# Arquitectura de la frontera de autenticación

La aplicación distingue cuatro estados: `authenticated`, `unauthenticated`, `loading` y `not_configured`. En Fase 10.C `getWorkspaceSession()` siempre retorna `not_configured`, sin identificador de sesión, sujeto ni proveedor.

## Capas de protección

1. `middleware.ts` intercepta `/app/:path*` antes del render.
2. `app/app/layout.tsx` ejecuta `requireWorkspaceSession()` como defensa redundante.
3. `SiteFrame` nunca inyecta el shell público en `/app`.

Sin sesión válida, el destino es `/iniciar-sesion?returnTo=...`. `sanitizeWorkspaceReturnTo()` solo admite `/app` y sus subrutas, rechaza orígenes absolutos, rutas protocol-relative, barras invertidas, caracteres de control, segmentos codificados peligrosos y normalizaciones fuera de `/app`.

No se usan query params, localStorage o cookies para simular autenticación. Las opciones futuras de proveedor requieren una decisión explícita sobre seguridad, ciclo de sesión, revocación, recuperación y tratamiento de datos.
