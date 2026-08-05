# Auditoría de la capa de aplicación jurisprudencial — Fase 11.C

## Alcance auditado

Se revisaron los contratos canónicos y esquemas de `types/jurisprudence.ts`, `lib/schemas/jurisprudence.ts` y `lib/jurisprudence-domain.ts`; el puerto, esquemas, identidad, mapeo, errores, utilidades y adaptadores de 11.B; la suite `phase-11-b-jurisprudence-repository.test.ts`; ADR-012; y las carpetas `app`, `components`, `data`, `lib`, `types` y `tests` en busca de servicios, casos de uso, fachadas, factories, DTO, resultados discriminados y fronteras de servidor.

## Arquitectura encontrada

- Next.js 15.5.9 con App Router, TypeScript estricto, `exactOptionalPropertyTypes` y Zod 4.
- No existen `app/api`, archivos `route.ts`, endpoints HTTP ni Server Actions.
- La interfaz `/jurisprudencia` es una experiencia pública/demostrativa cliente y no importa repositorios ni persistencia.
- 11.A separa el registro interno de `JurisprudenceSearchItem` y `JurisprudenceDetail`; las funciones puras de publicación son reutilizables.
- 11.B expone un puerto asíncrono y dos adaptadores equivalentes, con errores estructurados, paginación máxima de 50 y cierre explícito.
- Los adaptadores clonan resultados y controlan idempotencia, deduplicación y versión.
- La persistencia SQLite usa `node:sqlite`; no existe conexión global ni variable de entorno.

## Patrones encontrados

- Validación estricta con esquemas Zod y objetos `.strict()`.
- Excepciones tipadas para errores del repositorio.
- Inyección por constructor de reloj e identificador en los adaptadores.
- Interfaces de puerto en `types/` e implementación plana en `lib/`.
- Componentes interactivos identificados mediante `"use client"`.
- Método `close()` en el puerto y en ambos adaptadores.

## Patrones ausentes

- No había servicio de aplicación ni fachada interna.
- No había factory común, contexto operativo, logger o DTO de aplicación.
- No existe un tipo `Result` transversal.
- No existe paquete o marcador `server-only` instalado explícitamente.
- No existen autorización, actor real, telemetría, transporte o ciclo de vida compartido de proceso.

## Riesgos detectados

1. Un consumidor podía importar directamente SQLite o el puerto y omitir las reglas de aplicación.
2. `JurisprudenceRecord` contiene notas, contenido generado, `verifiedBy` y ubicación interna; devolverlo como respuesta pública filtraría datos.
3. `null` podía representar indistintamente inexistencia y falta de publicación.
4. Paginar candidatos y filtrar después produciría totales públicos falsos.
5. Crear una conexión en cada operación perdería historial operativo y podría dejar manejadores abiertos.
6. El repositorio estaba reexportado accidentalmente desde barrels generales de tipos y esquemas.
7. No existía correlación operativa ni contrato de logging seguro.
8. La búsqueda pública contiene filtros que el repositorio no soporta directamente.
9. No existe aún autorización de usuarios ni política automática de anonimización.

## Contratos reutilizados

- `jurisprudenceRecordSchema` y `jurisprudenceNewRecordSchema`.
- `normalizeJurisprudenceSearchInput`.
- `getJurisprudencePublicationBlockers` e `isJurisprudenceRecordPublic`.
- `toPublicJurisprudenceSearchItem` y `toPublicJurisprudenceDetail`.
- `JurisprudenceRepository`, filtros, paginación, historial y errores.
- Identidad externa, idempotencia y control optimista implementados por 11.B.

## Límites adoptados

```text
consumidor interno
  → JurisprudenceInternalApi
  → JurisprudenceApplicationService
  → reglas puras de 11.A
  → JurisprudenceRepository
  → adaptador inyectado
```

- Dominio: valida significado y publicación; no conoce transporte ni SQLite.
- Aplicación: valida casos de uso, coordina, proyecta y traduce errores.
- Persistencia: conserva registros e historial; no decide publicación.
- Transporte: inexistente en 11.C.
- UI: permanece desconectada.

## Organización decidida

Se conserva la convención plana existente: un archivo de tipos, uno de esquemas, error, servicio, fachada y factory. No se crea un segundo servicio equivalente. Los contratos internos no se reexportan desde barrels públicos.

## Estrategia pública limitada

La aplicación solicita candidatos con estados mínimos `verified/published/verified`, recorre páginas internas de 50 hasta un máximo explícito, aplica todos los bloqueos y filtros restantes, ordena y pagina después de formar el conjunto público. Si se alcanza el límite antes de revisar todos los candidatos, responde `dataStatus: partial`; no afirma un total global exhaustivo.

## Decisiones pendientes

- proveedor y modelo de autorización;
- almacenamiento definitivo PostgreSQL;
- consulta optimizada exclusivamente de publicables;
- búsqueda full-text y relevancia;
- política de datos personales y anonimización;
- transporte HTTP, códigos HTTP y rate limiting;
- ciclo de vida por proceso en el entorno definitivo;
- integración con `/jurisprudencia`.
