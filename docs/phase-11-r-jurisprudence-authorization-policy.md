# Phase 11.R - Jurisprudence Authorization Policy Kernel

## Descripción General

La Fase 11.R implementa un núcleo puro y aislado para tomar decisiones de autorización relativas al módulo de Jurisprudencia. No se ha modificado la capa de transporte (`middleware.ts`), ni los validadores de workspace (`workspace-guard.ts`), ni se ha implementado autenticación real. Toda la funcionalidad reside en funciones inmutables, deterministas y puras.

## Decisiones Estructurales

1. **Aislamiento Contractual**: 11.R respeta de forma estricta los contratos preexistentes definidos en `types/jurisprudence-security.ts`.
2. **Operaciones Inalteradas**: No se amplió `JurisprudenceSecurityOperation`. Las únicas operaciones evaluables son las 10 preexistentes (`search_public`, `get_public_detail`, `list_internal`, `get_internal`, `create_record`, `update_editorial`, `update_source`, `evaluate_publication`, `get_history`, `close`).
3. **Restricción de Publicación y Auditoría**: Los permisos de publicación (`jurisprudence.internal.publish`, `jurisprudence.internal.unpublish`) y auditoría (`jurisprudence.internal.audit`) han quedado desvinculados temporalmente de operaciones en tiempo de ejecución, es decir, el núcleo los considera como capacidades reservadas hasta que una operación correspondiente sea formalmente diseñada en los contratos. No se han creado operaciones falsas o simuladas.
4. **Política de Default Deny**: La política implementa una estricta denegación por defecto. Cualquier estructura de entrada desconocida, rol no contemplado, o intento de saltar los niveles requeridos deriva en un código de denegación (`POLICY_ERROR`, `INVALID_PRINCIPAL`, `AUTHENTICATION_REQUIRED`, `MISSING_PERMISSION`).

## Integración con Principals Fixtures

Se dispone de principals estáticos en `lib/auth/fixtures/jurisprudence-principal-fixtures.ts` que simulan diversas identidades para validación estructural pura, sin requerir proveedores de sesión externos, garantizando el aislamiento requerido.
