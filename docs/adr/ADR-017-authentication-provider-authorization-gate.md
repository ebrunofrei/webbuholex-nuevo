# ADR-017 — Puerta de autorización del proveedor de identidad

- Estado: `approved_decision_package` — expediente técnico y puerta de autorización validados; decisión institucional vigente: `defer`
- Fecha: 2026-07-29
- Fase: 11.F.2

## Contexto

11.F.1 validó una arquitectura neutral y registró Auth0 4.26.0 como recomendación condicionada. No seleccionó ni aprobó proveedor. El SDK acepta Next.js 15.5.9, pero sus peers no aceptan React ni React DOM 19.1.1.

## Decisión

Adoptar una puerta discriminada `authorize | reject | defer`, con `defer` como decisión actual. La ruta técnica preferente es actualizar React y React DOM conjuntamente de 19.1.1 a 19.1.2, pero no está autorizada ni ejecutada.

Una decisión `authorize` exige simultáneamente owner institucional, revisión contractual/costo, privacidad, cambios de dependencias, actualización conjunta, inspección del árbol resuelto, gestor de secretos, session store productivo, dominio/HTTPS y autorización expresa. No existe override.

Quedan prohibidos `--force`, `--legacy-peer-deps`, overrides de peers y edición manual del lockfile.

## Alternativas

1. Forzar peers: rechazada por producir una instalación no respaldada por el SDK.
2. Mantener 19.1.1: segura, pero mantiene Auth0 no instalable y autenticación diferida.
3. Actualizar conjuntamente a 19.1.2: ruta preferida, pendiente de autorización y regresión completa.
4. Saltar a 19.2.x: diferida por mayor superficie de cambio.
5. Reabrir proveedor: no justificado solo por un desfase mínimo de parche; posible si fallan condiciones institucionales o técnicas.

## Condiciones institucionales

Se requiere titularidad del tenant, responsables, contratación/costo, DPA y privacidad, subencargados y residencia, secretos, sesiones productivas, dominio/HTTPS, monitoreo, rate limiting, auditoría durable e incident response operativo.

## Rollback

Mantener `not_configured`; si una integración futura se revierte, revocar sesiones, retirar callbacks, rotar secretos, retirar adapter/SDK, restaurar React y React DOM conjuntamente mediante pnpm y ejecutar validación completa.

## Consecuencias

Auth0 4.26.0 continúa siendo una recomendación condicionada pendiente de autorización. El proveedor no está seleccionado ni aprobado; la dependencia no está autorizada ni instalada; no existe autenticación real, `app/api`, `route.ts` ni endpoint. `/jurisprudencia` permanece desconectada. No hubo publicación ni despliegue.

## Validación oficial

La copia externa física, sincronizada y equivalente `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-f-2` aprobó `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` con código 0. Vitest registró 38 archivos y 466 pruebas aprobadas, incluidas 24 pruebas de 11.F.2. Next.js generó 46 de 46 páginas.

La ejecución registró advertencias no bloqueantes de SQLite experimental, jsdom `HTMLCanvasElement.getContext()` y React Testing Library `act(...)`; no se califica como completamente libre de advertencias. El `EPERM` del árbol original se conserva como antecedente y no se modificaron ACL ni dependencias.

Esta aprobación valida el expediente, no cambia `defer`, no autoriza React/React DOM 19.1.2 y no habilita 11.F.3.
