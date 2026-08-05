# Fase 11.F.1 — Arquitectura de autenticación propuesta

## Frontera

`Request futuro → Auth0/OIDC → adaptador verificador → ExternalIdentityResolution → ProviderBackedJurisprudenceAuthenticator → JurisprudencePrincipal → política 11.E → guard → handler 11.D → API 11.C → repositorio 11.B`.

No hay ruta, cookie, cuenta ni llamada externa activa.

## Responsabilidades

- El proveedor verifica identidad, sesión, issuer, audience, firma y expiración.
- El adaptador traduce resultados sin filtrar tokens o mensajes del proveedor.
- El repositorio de roles interno confirma sujeto activo, roles cerrados y versión de asignación.
- La política 11.E decide permisos. El proveedor no asigna estados editoriales ni autoridad jurídica.
- La aplicación recibe una referencia opaca de actor; nunca correo, nombre, DNI, token, cookie o claims completos.

## Configuración neutral

Los contratos distinguen `not_configured`, `configured_for_test`, `configured`, `invalid` y `unavailable`. La lectura es explícita mediante una función; no se lee `process.env` durante la importación.

Parámetros previstos: provider kind, issuer, client ID, audience, sesión stateful, cookie, TTL absoluto e inactivo, orígenes exactos, entorno, fuente de roles y referencias de secretos. Los secretos no forman parte de un objeto serializable.

## Roles

La fuente recomendada es una tabla o repositorio institucional separado del repositorio jurisprudencial. El `subjectId` del proveedor es opaco. Correo y nombre pueden existir en el proveedor para sus flujos, pero no son la clave interna de autorización. Un cambio de roles incrementa `roleAssignmentVersion` y fuerza refresco o invalidación de la sesión.

## Datos tratados

El proveedor administrado trataría identificadores opacos, datos necesarios para login/recuperación/MFA y telemetría de identidad según el contrato futuro. BúhoLex conservaría referencias opacas de sujeto y sesión, versión de roles y eventos mínimos. DPA, residencia, subencargados y retención deben aprobarse antes de crear el tenant.

## Estado

Arquitectura neutral preparada. Auth0 4.26.0 es una recomendación condicionada pendiente de autorización, no una selección institucional. El proveedor no está aprobado; la dependencia no está autorizada ni instalada; React y React DOM no satisfacen los peers. No existen autenticación real ni endpoints montados.
