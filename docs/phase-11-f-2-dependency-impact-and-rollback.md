# Fase 11.F.2 — Dependencias, impacto y rollback

## Estado de revisión

- Dependencias directas documentadas desde el manifiesto oficial de Auth0 4.26.0: sí.
- Árbol transitivo materialmente resuelto e inspeccionado: no.
- Árbol transitivo aprobado: no.
- Advisories y licencias jurídicamente aprobados: no; revisión pendiente antes de autorizar.

No se instaló ni resolvió el paquete en el proyecto.

## Dependencias directas declaradas

| Dependencia | Función | Licencia declarada | Nivel | Runtime | Superficie sensible | Revisión/rollback |
|---|---|---|---|---|---|---|
| `@edge-runtime/cookies@^5.0.1` | Parseo y mutación de cookies Web/Edge | La documentación del paquete indica MPL-2.0; el registro muestra metadatos inconsistentes y exige verificación del LICENSE del artefacto exacto | directa de Auth0 | servidor/edge | cookies de sesión | Revisar licencia/advisories; se retira con el SDK |
| `@panva/hkdf@^1.2.1` | Derivación HKDF con criptografía nativa | MIT | directa de Auth0 | servidor y runtimes Web compatibles | criptografía | Revisar advisory y soporte runtime; se retira con el SDK |
| `jose@^6.0.11` | JOSE, JWS, JWE, JWT y JWK | MIT | directa de Auth0 | servidor/edge/web | criptografía y tokens | Revisión criptográfica prioritaria; revocar sesiones antes de retirar |
| `oauth4webapi@^3.8.2` | Primitivas OAuth 2/OIDC | MIT | directa de Auth0 | servidor/edge/web | OAuth/OIDC | Revisar advisories y protocolo; se retira con el SDK |
| `openid-client@^6.8.0` | Cliente de alto nivel OpenID Connect/OAuth | MIT | directa de Auth0 | principalmente servidor, con runtimes Web compatibles | OIDC, issuer y callbacks futuros | Revisar advisories/compatibilidad; retirar adapter y callbacks futuros |
| `swr@^2.2.5` | Hooks React de obtención y revalidación de datos | MIT | directa de Auth0 | cliente y SSR según uso | estado de cliente | Confirmar que no exponga tokens; se retira con el SDK |

Fuentes primarias: [package.json de Auth0 4.26.0](https://raw.githubusercontent.com/auth0/nextjs-auth0/v4.26.0/package.json), [repositorio edge-runtime](https://github.com/vercel/edge-runtime), [@panva/hkdf](https://github.com/panva/hkdf), [jose](https://github.com/panva/jose), [oauth4webapi](https://github.com/panva/oauth4webapi), [openid-client](https://github.com/panva/openid-client) y [SWR](https://github.com/vercel/swr).

## Impacto previsible de una implementación autorizada

Cambiarían, como mínimo, `package.json`, `pnpm-lock.yaml`, React, React DOM, la configuración de entorno sin secretos y el composition root del servidor. Una fase posterior tendría que revisar el árbol transitivo materialmente resuelto, advisories, licencias, tamaño y superficie servidor/cliente antes de aceptar el lockfile.

No hay autorización para esos cambios en 11.F.2.

## Rollback propuesto

1. Detener el montaje futuro y conservar `not_configured`.
2. Revocar sesiones y credenciales del tenant antes de retirar integración, si llegaran a existir.
3. Retirar adapter, SDK y configuración específica mediante un cambio revisado.
4. Restaurar React/React DOM conjuntamente a la versión previa mediante el gestor, nunca editando manualmente el lockfile.
5. Rotar o destruir secretos en su gestor y retirar callbacks/orígenes del proveedor.
6. Ejecutar lint, typecheck, pruebas y build completos.

El rollback no puede consistir solo en eliminar el paquete: debe contemplar sesiones, tenant, secretos, roles, callbacks y evidencia de auditoría.

## Estado oficial del expediente

El expediente quedó validado como `approved_decision_package` sobre una copia externa física, sincronizada y equivalente. Los cuatro comandos de pnpm concluyeron con código 0; Vitest registró 38 archivos, 466 pruebas y 24 pruebas específicas, y Next.js generó 46/46 páginas.

La validación no convierte el árbol transitivo en aprobado, no autoriza dependencias y no modifica la decisión `defer`. Auth0 no fue instalado; React y React DOM permanecen en 19.1.1. La ruta conjunta a 19.1.2 continúa pendiente de autorización. Las advertencias observadas fueron no bloqueantes y la salida no se considera completamente libre de advertencias.
