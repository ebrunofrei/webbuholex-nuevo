# Fase 11.F.1 — Matriz de decisión del proveedor

## Método

La escala es 1–5. La puntuación ponderada se expresa sobre 100. Los pesos suman 100: compatibilidad 10, seguridad 12, revocación 9, sesiones servidor 8, roles 7, MFA 6, privacidad 8, portabilidad 6, complejidad 6, costo 5, observabilidad 4, pruebas 5, dependencia de infraestructura 4, mantenimiento 5 y respuesta a incidentes 5.

| Alternativa | Puntuación | Evaluación |
|---|---:|---|
| Auth0 administrado + SDK oficial Next.js | 82 | Mejor equilibrio condicionado: SDK App Router, sesiones de servidor, MFA/recuperación administrados y APIs de revocación. Requiere tenant, dependencia nueva, validación del peer de React, evaluación contractual y session store duradero. |
| Clerk administrado | 77 | Integración Next.js y revocación maduras; aumenta dependencia del proveedor y varias políticas avanzadas dependen de configuración/plan. |
| Better Auth autogestionado | 73 | Sesiones stateful y fuerte control local; exige base y operación propia, más dependencias y una ruta de autenticación futura. |
| Auth.js + OIDC institucional | 72 | Portabilidad alta y buena integración conceptual; la línea v5 consultada continúa beta y la revocación depende del IdP y del almacenamiento elegido. |
| Microsoft Entra ID / OIDC corporativo | 70 | Conveniente si EMCCON confirma tenant, ownership y administración corporativa; esos datos no existen hoy. |
| Identidad de futura plataforma de datos | 65 | Podría unificar operación, pero acopla identidad y base antes de escoger la plataforma de producción. |
| Proxy o gateway corporativo | 50 | Reduce lógica de aplicación, pero no existe infraestructura, ownership ni propagación de sesión confiable definida. |
| Credenciales locales y sesiones propias | 42 | Máximo control, pero traslada contraseñas, recuperación, MFA y seguridad operacional al proyecto; no se recomienda. |
| Mantener diferida la autenticación | 35 | Es el estado seguro inmediato, no una solución operativa. Impide montar rutas internas. |

## Recomendación condicionada

Se recomienda **Auth0 administrado**, con el SDK oficial `@auth0/nextjs-auth0@4.26.0`, únicamente para una futura 11.F.2 autorizada. La recomendación no equivale a aprobación ni instalación.

Estado inequívoco: proveedor recomendado Auth0; versión recomendada 4.26.0; selección institucional no realizada; proveedor no aprobado; dependencia no autorizada ni instalada; React y React DOM incompatibles con los peers; autenticación real inexistente; endpoints no montados. Es una **recomendación condicionada pendiente de autorización**.

El modelo propuesto mantiene roles en un repositorio institucional del servidor. El proveedor resuelve y verifica identidad; no concede permisos jurisprudenciales ni decide publicación.

## Dependencia propuesta

- Paquete directo: `@auth0/nextjs-auth0@4.26.0`.
- Seis dependencias directas: `@edge-runtime/cookies@^5.0.1`, `@panva/hkdf@^1.2.1`, `jose@^6.0.11`, `oauth4webapi@^3.8.2`, `openid-client@^6.8.0` y `swr@^2.2.5`.
- Antes de autorizar, debe capturarse el árbol transitivo completo mediante el gestor de paquetes y revisar licencias, advisories y peer dependencies. No se alteró el lockfile en 11.F.1.

## Comparación de versiones

4.25.0 y 4.26.0 declaran los mismos peers y las mismas seis dependencias directas. 4.26.0 añade soporte de session transfer token para CTE, `revokeRefreshToken()` y revocación durante logout, y corrige casos de issuer y nonce. No se identificó una regresión documentada ni una razón técnica suficiente para mantener 4.25.0. La política propuesta es evaluar siempre el último tag estable autorizado, fijar versión exacta en el manifiesto y actualizar solo después de revisar changelog, peers, seguridad y pruebas.

## Bloqueos de aprobación

- Incompatibilidad confirmada: React 19.1.1 y React DOM 19.1.1 frente al peer `~19.1.2` publicado por el SDK. Next.js 15.5.9 sí satisface `~15.5.9`.
- Falta autorización para modificar `package.json` y `pnpm-lock.yaml`.
- Tenant, owner institucional y responsables de incidentes no definidos.
- Costos, plan, DPA, residencia y retención de datos no verificados; por tanto, se registran como **no determinados**.
- Base de producción y session store duradero no decididos.
- Dominio, HTTPS, secretos, CORS, CSRF operativo y rate limiting no configurados.

## Alternativa sin dependencia nueva

Mantener `JurisprudenceAuthenticator` sin proveedor y las rutas no montadas. Es seguro y reversible, pero no ofrece login ni permite operaciones editoriales reales.

## Fuentes oficiales

- `package.json` de v4.26.0: https://raw.githubusercontent.com/auth0/nextjs-auth0/v4.26.0/package.json
- Changelog de v4.26.0: https://raw.githubusercontent.com/auth0/nextjs-auth0/v4.26.0/CHANGELOG.md
- Auth0 quickstart: https://auth0.com/docs/quickstart/webapp/nextjs
- Auth0 session store: https://auth0.github.io/nextjs-auth0/interfaces/types.SessionStoreOptions.html
- Auth.js en Next.js: https://nextjs.org/learn/dashboard-app/adding-authentication
- Clerk, revocación: https://clerk.com/docs/reference/backend/sessions/revoke-session
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side
- Better Auth, sesiones: https://better-auth.com/docs/concepts/session-management
- Microsoft Entra OIDC: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
