# Fase 11.E — Identidad, autorización y handlers protegidos

**Estado:** cerrada y aprobada; política y handlers protegidos validados, sin autenticación real ni rutas montadas.

## Propósito y límites

La fase incorpora una frontera tipada, puramente local y no montada. No existe autenticación real ni endpoint. La política protege los handlers de 11.D cuando se instancian explícitamente en pruebas o por un futuro composition root del servidor.

## Arquitectura

1. `JurisprudenceAuthenticator` produce un resultado discriminado.
2. El esquema valida un principal mínimo y no sensible.
3. La política asigna permisos mediante roles literales y decide una operación.
4. `JurisprudenceSecurityGuard` solo invoca el handler autorizado.
5. El handler conserva la validación HTTP de 11.D.
6. La API interna, dominio y repositorio permanecen encapsulados.

## Principales y niveles

- `anonymous`: sin subjectId, roles ni proveedor.
- `service` y `human`: subjectId opaco y nivel no anónimo.
- `test_only`: requiere `test_harness` y configuración explícita de la factory.
- `authenticated` y `strong_authenticated`: contratos futuros; esta fase no los emite mediante un proveedor real.

Un principal expirado o inválido es denegado. Ningún header de usuario, rol o administración se interpreta como identidad.

## Matriz y operaciones

Los permisos públicos son búsqueda y detalle. Los internos separan listado, lectura, historial, evaluación, creación, actualización editorial, actualización de fuente, publicación reservada, auditoría y cierre. `update_record` no se autoriza de forma genérica: `changeKind` determina el permiso.

Los roles no contienen wildcard. `jurisprudence_admin` tiene una lista auditable; `system_service` recibe únicamente listado, lectura y cierre. Ser autenticado no implica tener permisos. Una matriz reusable compara todos los roles y operaciones para detectar permisos inesperados, operaciones sin mapeo o una operación interna accidentalmente pública.

El guard impide utilizar `create_record` para introducir directamente un registro con `publicationStatus: published`. La futura publicación requiere un caso de uso propio; poseer un permiso reservado no crea esa capacidad.

## Respuestas y revelación

- ausencia o identidad inválida: 401;
- identidad válida sin permiso: 403;
- autenticador no disponible o guard cerrado: 503;
- lectura pública anónima autorizada: continúa al handler.

No se devuelven subjectId, roles, requiredPermission, internals de política, causa del autenticador, stack, headers ni token. Las respuestas llevan `no-store` y el mismo requestId. Los recursos privados continúan protegidos por la proyección y reglas de publicación de 11.A.

## Logging

Los eventos son `authentication_resolved`, `authentication_rejected`, `authorization_allowed`, `authorization_denied` y `authorization_error`. Solo se admite requestId, operación refinada, principalKind, resultCode, policyVersion y status. No se registra body, URL, query, contenido jurídico, subjectId, roles, permisos, headers, Authorization, token, cookies, datos personales ni credenciales. No se justificó un hash de sujeto en esta fase, por lo que tampoco se registra.

## Factories y lifecycle

`createSecuredJurisprudenceRouteHandlers` exige handlers, autenticador y política inyectados; no dispone de autenticador interno inseguro. La factory pública utiliza `AnonymousJurisprudenceAuthenticator` y solo expone `search`, `detail` y `close`. El autenticador de prueba reside en `tests/helpers`. Ninguna factory importa SQLite, lee variables de entorno, crea usuarios o abre recursos al importar.

`closeService` es una operación protegida. El `close` de la factory pertenece al propietario del composition root y es idempotente para liberar recursos incluso cuando el autenticador no está disponible.

## Readiness

Los contratos, motor y handlers de prueba están implementados. `authenticationReal` y `endpointsMounted` son `false`; ambas categorías de rutas permanecen no listas. El detalle completo está en `docs/phase-11-e-route-mount-readiness.md`.

## Seguridad y privacidad

No existe búsqueda por DNI, correo, teléfono, domicilio, IP o nombre de parte. No se almacenan identidades. La autorización no altera fuerza jurídica, verificación ni estado editorial. No se añadió provider SDK, secreto, cookie, JWT, usuario o base de identidad.

## Plan posterior

Una fase 11.F futura debe seleccionar proveedor, modelar sesión y revocación, propagar el principal autorizado al contexto de aplicación, definir CSRF/CORS/rate limiting, configurar auditoría durable y obtener autorización explícita antes de crear cualquier `route.ts`.
