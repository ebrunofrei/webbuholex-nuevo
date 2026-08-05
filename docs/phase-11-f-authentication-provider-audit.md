# Fase 11.F.1 — Auditoría del proveedor de autenticación

## Alcance

Esta auditoría describe el estado local observado antes de autorizar dependencias. No acredita autenticación real ni modifica el comportamiento del portal.

## Archivos revisados

- `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `middleware.ts`, `.env.example` y `.gitignore`.
- `types/auth.ts`, `lib/auth/session.ts`, `app/(auth)`, `app/(workspace)` y las pruebas de acceso y workspace.
- Contratos de 11.E: principal, autenticador, autorización, guard, handlers protegidos, logging y readiness.
- Contratos HTTP de 11.D y el ciclo de vida de la API interna de 11.C.

## Estado encontrado

- Stack: Next.js 15.5.9, App Router, React 19.1.1, Node.js 22 o superior, pnpm y TypeScript estricto.
- No hay SDK, biblioteca o proveedor de autenticación instalado.
- `/iniciar-sesion` es una superficie informativa; no autentica.
- `getWorkspaceSession()` devuelve `not_configured`; no crea ni valida sesiones.
- `middleware.ts` redirige `/app`, pero ese control visual no constituye autenticación ni autorización real.
- No existen base de usuarios, almacenamiento de sesiones, cuentas de producción, contraseñas, OAuth, JWT, cookies de sesión, recuperación de cuenta o MFA.
- No existe un composition root de autenticación, infraestructura de correo, dominio de despliegue confirmado, HTTPS confirmado, gestor de secretos ni propietario institucional formalizado para el tenant.
- La matriz y el guard de 11.E están preparados, pero solo consumen un `JurisprudenceAuthenticator` inyectado.

## Capacidades reutilizables

- `JurisprudencePrincipal` y `JurisprudenceAuthenticationResult`.
- Puerto `JurisprudenceAuthenticator`.
- Roles, permisos, default deny y guard no montado de 11.E.
- Request ID y logging seguro de 11.D/11.E.
- API interna y repositorio aislados de la identidad.

## Riesgos

1. Confundir el redirect del workspace con una sesión válida.
2. Montar rutas antes de disponer de identidad, revocación, CSRF, rate limiting y persistencia de producción.
3. Guardar roles en claims o sesiones durante demasiado tiempo y no invalidarlos tras un cambio.
4. Tratar correo, nombre o cabeceras del navegador como identidad autorizada.
5. Introducir secretos en Git o variables `NEXT_PUBLIC_*`.
6. Depender de una sesión local que no se sincronice con la sesión del proveedor.
7. Adoptar un SDK sin resolver sus peer dependencies exactas.

## Hallazgo de compatibilidad

El tag oficial `v4.26.0`, publicado el 28 de julio de 2026, declara Node.js 20 LTS o una versión LTS posterior. Su `package.json` fija los peers siguientes:

- Next.js: `^14.2.35 || ~15.0.7 || ~15.1.11 || ~15.2.8 || ~15.3.8 || ~15.4.10 || ~15.5.9 || ^16.0.10`.
- React: `^18.0.0 || ~19.0.1 || ~19.1.2 || ^19.2.1`.
- React DOM: `^18.0.0 || ~19.0.1 || ~19.1.2 || ^19.2.1`.

El proyecto usa Next.js 15.5.9, React 19.1.1 y React DOM 19.1.1. Next.js es compatible; React y React DOM no satisfacen `~19.1.2`. La instalación queda bloqueada hasta resolver ambos peers sin `--force`, `--legacy-peer-deps` u overrides.

La versión declara exactamente seis dependencias directas de runtime: `@edge-runtime/cookies@^5.0.1`, `@panva/hkdf@^1.2.1`, `jose@^6.0.11`, `oauth4webapi@^3.8.2`, `openid-client@^6.8.0` y `swr@^2.2.5`.

Comparada con 4.25.0, la 4.26.0 mantiene peers y dependencias directas, pero añade session transfer token para CTE, `revokeRefreshToken()` y revocación del refresh token durante logout, además de correcciones de issuer y nonce. No existe una razón técnica verificada para fijar 4.25.0; la recomendación condicionada se actualiza a 4.26.0.

## Conclusión

No existe autenticación real. La preparación neutral puede avanzar, pero la implementación queda detenida antes de alterar dependencias. También faltan tenant institucional, propietario, evaluación contractual y de privacidad, secretos administrados, dominio/HTTPS y almacenamiento duradero de sesiones.

Auth0 es únicamente el proveedor recomendado y 4.26.0 la versión recomendada. No existe selección institucional, aprobación, autorización o instalación. React y React DOM no satisfacen los peers; no existen autenticación real ni endpoints montados. El estado es una **recomendación condicionada pendiente de autorización**.

## Fuentes oficiales consultadas

- Next.js, guía de autenticación: https://nextjs.org/docs/app/guides/authentication
- Auth0 Next.js SDK: https://github.com/auth0/nextjs-auth0
- Auth0 quickstart para Next.js: https://auth0.com/docs/quickstart/webapp/nextjs
- `package.json` exacto de v4.26.0: https://raw.githubusercontent.com/auth0/nextjs-auth0/v4.26.0/package.json
- Changelog exacto de v4.26.0: https://raw.githubusercontent.com/auth0/nextjs-auth0/v4.26.0/CHANGELOG.md
- Referencia API v4.26.0 (`revokeRefreshToken`): https://auth0.github.io/nextjs-auth0/classes/server.Auth0Client.html
- Opciones de sesión del SDK: https://auth0.github.io/nextjs-auth0/interfaces/types.Auth0ClientOptions.html
- Auth0 Sessions API: https://auth0.com/docs/api/management/v2/sessions/revoke-session
