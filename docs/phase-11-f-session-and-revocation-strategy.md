# Fase 11.F.1 — Estrategia de sesión y revocación

## Modelo propuesto

- Sesión **stateful**, revocable y almacenada en un repositorio duradero futuro, separado de SQLite jurisprudencial.
- Identificador opaco; nunca JWT accesible a JavaScript.
- Cookie propuesta: `__Host-buholex_session`, `HttpOnly`, `Secure` en producción, `SameSite=Lax`, `Path=/`, sin `Domain`.
- Valores iniciales sujetos a aprobación: 8 horas de vida absoluta y 30 minutos de inactividad.
- Rotación al autenticarse, elevar autenticación, recuperar cuenta o cambiar roles.
- Clock skew máximo controlado; la configuración neutral admite validación, no emite sesiones.

## Revocación

- Cierre de sesión: revocar sesión local y, cuando proceda, la sesión/refresh token del proveedor.
- Cierre global: revocar todas las sesiones asociadas al `subjectId` opaco.
- Cuenta suspendida: denegar aunque exista cookie vigente.
- Cambio de roles: comparar `roleAssignmentVersion`; una versión desactualizada invalida o fuerza refresco.
- Caída del proveedor: las operaciones internas fallan de forma cerrada. La política de tolerancia para lectura pública sigue pendiente.
- Replay: rotación, identificadores opacos, expiración e invalidación atómica.

Auth0 dispone de una Sessions API para revocación y back-channel logout, pero este último requiere configuración, HTTPS y almacenamiento duradero de `sid`; no está habilitado en esta fase. El SDK 4.26.0 añade `revokeRefreshToken()` y la revocación del refresh token durante logout, lo que refuerza la preferencia por 4.26.0 frente a 4.25.0 sin convertir la propuesta en una integración activa.

## CSRF y CORS

Como la estrategia usa cookie:

- validar `Origin` y `Host` exactos en métodos inseguros;
- usar SameSite y token CSRF para operaciones de mutación cuando se monten rutas;
- exigir reautenticación en acciones críticas futuras;
- no aceptar method override;
- no configurar CORS wildcard; la lista exacta se decidirá con el dominio de despliegue.

No existe protección CSRF operativa porque no existen cookies ni endpoints.

## Decisiones pendientes

PostgreSQL u otro session store de producción, disponibilidad durante caída del IdP, TTL definitivos, back-channel logout, límites de sesión concurrente y proceso institucional de soporte.

Auth0 y `@auth0/nextjs-auth0@4.26.0` constituyen una recomendación condicionada pendiente de autorización. No existe selección institucional, aprobación, dependencia autorizada o instalada, compatibilidad actual de React/React DOM, autenticación real ni endpoint montado.
