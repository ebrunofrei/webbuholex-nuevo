# ADR-016 — Proveedor de identidad, sesiones y secretos

**Estado:** `approved_architecture` — arquitectura validada; recomendación condicionada pendiente de autorización para seleccionar proveedor o modificar dependencias.

## Contexto

11.E dejó una política y guards probados, pero sin identidad real. No pueden montarse rutas internas sin un proveedor, sesiones revocables, secretos, CSRF y operación institucional.

## Decisión propuesta

Registrar como recomendación condicionada pendiente de autorización a Auth0 y `@auth0/nextjs-auth0@4.26.0`, con sesiones stateful en un almacén duradero futuro, roles en un repositorio institucional propio y adaptación al principal de 11.E. La propuesta queda bloqueada hasta autorizar la dependencia y resolver los peers de React 19.1.1 y React DOM 19.1.1 frente a `~19.1.2`.

No se conserva 4.25.0: el tag 4.26.0 mantiene los mismos peers y dependencias directas, añade `revokeRefreshToken()` y revocación durante logout, incorpora session transfer token para CTE y corrige issuer/nonce. Estas mejoras son coherentes con la estrategia de revocación y no se identificó una razón técnica verificable para fijar la versión anterior.

No se crea HTTP, callback, cookie, cuenta, secreto ni SDK en 11.F.1.

No existe selección institucional del proveedor. Auth0 no está aprobado, la dependencia no está autorizada ni instalada, React y React DOM no son compatibles con los peers actuales, la autenticación real no existe y no hay endpoints montados.

## Arquitectura

El proveedor verifica identidad. Un adaptador neutral entrega un resultado verificado; `ProviderBackedJurisprudenceAuthenticator` comprueba issuer, audience, expiración, estado del sujeto y versión de roles. La matriz 11.E concede permisos. Ninguna capa de identidad decide publicación ni accede al repositorio jurisprudencial.

## Sesiones y revocación

Sesión stateful, identificador opaco, cookie HttpOnly/Secure/SameSite Lax, expiración absoluta e inactiva, rotación e invalidación por suspensión o cambio de roles. Revocación individual y global debe abarcar session store y proveedor. SQLite no será session store de producción.

## Roles y principal

El `subjectId` es opaco. Los roles se obtienen en servidor y se versionan. No se admiten correo, nombre, DNI, teléfono, IP o headers del navegador como autoridad.

## Secretos

Se resuelven por referencia desde un gestor futuro, nunca desde `NEXT_PUBLIC_*`, Git o configuración serializable. Owner institucional, rotación y separación por entorno son obligatorios.

## CSRF, CORS y privacidad

Las cookies exigen Origin/Host exactos, SameSite, token CSRF para mutaciones y reautenticación crítica. CORS queda cerrado hasta conocer orígenes reales. DPA, residencia, subencargados, retención y titularidad del tenant requieren aprobación previa.

## Auditoría y lifecycle

Solo se registran referencias opacas, request ID, resultado, proveedor y entorno. Nunca tokens, cookies, secretos, claims completos o datos jurídicos. El adaptador debe cerrarse de forma idempotente y fallar cerrado ante indisponibilidad.

## Alternativas

Se evaluaron Clerk, Auth.js/OIDC, Better Auth, Supabase, Entra ID, credenciales locales, gateway corporativo y mantener la autenticación diferida. Auth0 ofrece el mejor equilibrio provisional, pero no está aprobado.

## Consecuencias y riesgos

- Nueva dependencia y lock-in administrado.
- Operación, costo y tratamiento de datos pendientes.
- Riesgo de divergencia entre sesión del IdP y sesión de aplicación; se requiere revocación coordinada.
- Peers de React y React DOM pendientes; no se usarán `--force`, `--legacy-peer-deps` ni overrides.
- La aplicación permanece segura y sin rutas mientras la propuesta no se autorice.

## Migración y rollback

El puerto neutral permite reemplazar al proveedor. El rollback elimina el adapter/SDK futuro, restaura el estado `not_configured`, revoca sesiones y mantiene rutas internas sin montar. Los roles institucionales no deben quedar acoplados a metadata propietaria.

## Decisiones diferidas

Autorización de dependencia, tenant y owner, session store de producción, precios, DPA, dominio/HTTPS, secretos, MFA, recuperación, TTL finales, CORS, CSRF operativo, rate limiting y montaje de rutas.

## Validación oficial

La copia externa sincronizada y equivalente `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-f` aprobó lint, typecheck, test y build con código 0. Vitest registró 37 archivos y 442 pruebas aprobadas, incluidas 40 pruebas de 11.F.1. Next.js generó 46 de 46 páginas.

Se observó `ExperimentalWarning: SQLite is an experimental feature and might change at any time`, advertencia no bloqueante. El árbol original conservó el antecedente EPERM sobre ejecutables de `node_modules`; no se modificaron ACL, permisos ni dependencias.

La aprobación se limita a la arquitectura neutral. Auth0 4.26.0 sigue siendo una recomendación condicionada; no existe selección institucional, aprobación del proveedor, SDK instalado, autenticación real, endpoint montado, publicación o despliegue.
