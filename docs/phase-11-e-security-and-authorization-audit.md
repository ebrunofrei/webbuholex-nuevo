# Fase 11.E — Auditoría de seguridad, identidad y autorización

## Alcance auditado

Se revisaron `middleware.ts`, `types/auth.ts`, `lib/auth/session.ts`, `lib/auth/workspace-guard.ts`, `app/(auth)/iniciar-sesion/page.tsx`, la estructura de `app/(workspace)/app`, los contratos de aplicación de 11.C, el controlador HTTP y la factory no montada de 11.D, los archivos de configuración, las variables de entorno referenciadas y las pruebas de rutas, acceso y transporte.

## Estado real encontrado

- No existe proveedor de identidad, base de usuarios, credenciales, OAuth, JWT, cookie de sesión ni sesión persistente.
- `getWorkspaceSession()` devuelve `not_configured`; la protección de `/app` es un límite honesto que redirige al acceso, pero no equivale a autenticación real.
- `/iniciar-sesion` es una presentación preparatoria y no transmite credenciales.
- No existían principal canónico, roles jurisprudenciales, permisos por operación ni auditoría de decisiones de autorización.
- La API interna de 11.C y los handlers de 11.D son del lado servidor y no están importados desde componentes.
- No existe `app/api`, ningún `route.ts`, Server Action ni URL jurisprudencial activa.
- No existe política operativa de CSRF, CORS, rate limiting, secretos o sesiones para jurisprudencia.
- El transporte de 11.D ya controla método, query, headers, cuerpo, requestId, logging y proyecciones, pero carecía de una frontera de identidad anterior al handler.

## Riesgos identificados

1. Montar operaciones editoriales sin autenticación real permitiría invocaciones anónimas aun cuando el DTO y el repositorio fueran seguros.
2. Confiar en `x-user-id`, `x-role`, `x-admin` o cabeceras equivalentes permitiría suplantación directa.
3. Tratar el redirect de `/app` como autenticación trasladaría una protección visual a una frontera que no puede ofrecer.
4. Un principal autenticado sin política por operación podría recibir privilegios excesivos.
5. Resolver permisos por URL o método acoplaría autorización y transporte y haría ambiguo `update_record`, cuyo permiso depende de `changeKind`.
6. Exponer el permiso requerido, roles o subjectId en respuestas facilitaría enumeración interna.
7. Montar lectura pública ahora omitiría decisiones pendientes de rate limiting, privacidad, persistencia productiva y autorización editorial de montaje.

## Contratos reutilizados

- `JurisprudenceInternalApi` conserva los casos de uso y las proyecciones seguras.
- `JurisprudenceRouteHandlers` conserva los handlers Web Standard no montados.
- El `x-request-id`, los envelopes JSON, `Cache-Control: no-store` y el límite de 256 KiB se reutilizan.
- Las reglas de publicación de 11.A siguen siendo independientes y no son sustituidas por autorización.
- El ciclo de vida de 11.C/11.D continúa perteneciendo a la factory; el guard solo añade una operación protegida de cierre y un `dispose()` de propietario.

## Decisión

Se añade una capa sin efectos laterales compuesta por contratos de principal y autenticación, esquema estricto, matriz literal role–permission, motor puro de autorización, puerto de autenticación, autenticador anónimo, guard de transporte y factory de wrappers no montados. El autenticador de prueba reside exclusivamente en `tests/helpers` y recibe un resultado inyectado; nunca crea identidad desde cabeceras.

Para `update_record` se utiliza una copia de `Request`: primero se autentica; después se lee y valida `changeKind` con el mismo esquema y límite de 11.D; finalmente se autoriza `update_editorial` o `update_source`. El stream original queda disponible para el controlador.

## Límites entre capas

- Autenticación resuelve identidad; no concede permisos.
- Autorización decide una operación; no modifica registros ni estados.
- El guard aplica la decisión antes del handler; no conoce SQLite ni SQL.
- El handler adapta HTTP; no crea identidad.
- La aplicación coordina casos de uso y publicación; no decide autenticación.
- El repositorio persiste; no publica ni autoriza.

## Pendientes para autenticación y montaje reales

- proveedor y protocolo de identidad aprobados;
- almacenamiento y ciclo de vida de usuarios/sesiones;
- revocación, expiración y nivel fuerte verificables;
- autorización administrativa para asignar roles;
- políticas CSRF, CORS y rate limiting;
- persistencia productiva y secretos gestionados;
- auditoría durable de accesos;
- revisión de privacidad y política de exposición pública;
- aprobación expresa para crear rutas.

Hasta resolverlos, tanto rutas públicas como internas permanecen declaradas `readyToMount: false`.
