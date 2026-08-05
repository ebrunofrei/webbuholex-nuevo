# Fase 11.F.1 — Estrategia de secretos

## Contrato

`AuthenticationSecretProvider` resuelve `AuthenticationSecretReference`; el código consumidor no recibe secretos desde configuración pública ni los carga durante importación.

## Clasificación futura

- client secret OIDC;
- secreto de firma/cifrado de sesión;
- claves de cifrado;
- webhook secret, si se autoriza back-channel logout;
- credencial de la base de sesiones.

## Variables previstas

El SDK recomendado documenta `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` y la URL base de la aplicación. La capa neutral usa referencias `AUTH_CLIENT_SECRET_REFERENCE` y `AUTH_SESSION_SECRET_REFERENCE`; los nombres definitivos y el adaptador al gestor de secretos se decidirán en 11.F.2.

Ninguna referencia secreta puede comenzar con `NEXT_PUBLIC_`. No se añadió ningún valor a `.env.example` porque todavía no existe autorización ni proveedor aprobado.

## Política

- secretos fuera de Git, fixtures, logs, capturas y respuestas;
- entornos separados y mínimo privilegio;
- rotación con periodo de coexistencia controlado cuando el proveedor lo permita;
- propietario institucional y acceso auditable;
- revocación inmediata tras incidente;
- nunca almacenar secretos como texto dentro de configuración serializable.

## Pendientes

Proveedor institucional de secretos, owner, rotación, procedimiento de emergencia, dominio de despliegue y credenciales de producción.
