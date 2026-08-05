# Fase 11.F.2 — Autorización del proveedor de identidad

## Estado

El expediente técnico y la puerta `authorize | reject | defer` están validados con estado `approved_decision_package`. La decisión institucional vigente es `defer`.

La arquitectura validada no equivale a proveedor seleccionado, proveedor aprobado, dependencia autorizada, dependencia instalada ni autenticación real.

## Recomendación condicionada

- Proveedor recomendado: Auth0.
- Paquete recomendado: `@auth0/nextjs-auth0@4.26.0`.
- Proveedor seleccionado institucionalmente: no.
- Proveedor aprobado: no.
- Dependencia autorizada: no.
- Dependencia instalada: no.

## Puerta de autorización

Una decisión futura `authorize` requiere autorización expresa del titular y evidencia completa sobre titularidad del tenant, contratación y costos, privacidad, árbol de dependencias, actualización conjunta de React y React DOM, secretos, sesiones productivas y dominio de despliegue.

Mientras falte cualquiera de esas condiciones, el estado seguro es `not_configured` y la decisión permanece `defer`. No existe override, bypass, `forceApprove` ni autorización implícita derivada de la validación técnica.

## Compatibilidad

Next.js 15.5.9 es compatible. React y React DOM 19.1.1 no satisfacen los peers vigentes del SDK. La resolución mínima identificada es actualizar ambos conjuntamente a 19.1.2; no está autorizada ni ejecutada.

Quedan prohibidos `--force`, `--legacy-peer-deps`, overrides y edición manual del lockfile.

## Validación oficial

La copia externa física y materialmente equivalente aprobó:

- `pnpm lint`: código 0;
- `pnpm typecheck`: código 0;
- `pnpm test`: código 0;
- `pnpm build`: código 0;
- 38 archivos y 466 pruebas;
- 24 pruebas específicas de 11.F.2;
- 46 de 46 páginas generadas.

Se observaron advertencias no bloqueantes de SQLite experimental, jsdom y React Testing Library. El árbol original conserva como antecedente el bloqueo `EPERM`; no se modificaron ACL ni dependencias.

## Alcance

No existe autenticación real, SDK instalado, tenant, secretos, cookies, sesiones, callback, logout, `app/api`, `route.ts` ni endpoint activo. `/jurisprudencia` permanece desconectada. No hubo publicación ni despliegue y no se inicia 11.F.3.
