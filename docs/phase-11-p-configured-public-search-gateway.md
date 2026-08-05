# Fase 11.P: Conexión Controlada del Gateway Público Jurisprudencial (Especificación Técnica)

## Visión General

La Fase 11.P establece la conexión técnica entre la interfaz pública de usuario y las capas de índice de búsqueda (11.M) y read model (11.L). La integración opera bajo un esquema de defensa en profundidad y deneagación por defecto ("default deny"), asegurando que ante la ausencia de autorización explícita de producción, el sistema retorne `not_configured` sin instanciar componentes internos de persistencia.

## Componentes Principales

1. **ConfiguredJurisprudencePublicSearchGateway** (`lib/configured-jurisprudence-public-search-gateway.ts`):
   - Conecta con `JurisprudencePublicSearchIndexService` para realizar consultas ponderadas.
   - Conecta con `JurisprudencePublicReadModelRepository` para recuperar el detalle activo por slug.
   - Aplica proyecciones de allowlist explícito para filtrar identificadores internos (`publicRecordId`, `recordId`, `recordVersion`, etc.).

2. **Server Actions Públicas** (`lib/jurisprudence-public-search-actions.ts`):
   - `searchPublicJurisprudenceAction(query)`: Valida la consulta con `jurisprudencePublicSearchQuerySchema` y evalúa el readiness. Si la activación no está autorizada, retorna `not_configured`.
   - `getPublicJurisprudenceBySlugAction(slug)`: Valida el slug con `jurisprudencePublicSlugSchema` y evalúa el readiness. Si la activación no está autorizada, retorna `not_configured`.

3. **Readiness y Contexto** (`lib/jurisprudence-public-search-activation-readiness.ts` & `lib/jurisprudence-public-search-context.ts`):
   - `evaluateJurisprudencePublicSearchActivationReadiness()`: Devuelve el estado de readiness con `activationAuthorized: false`.
   - `createPublicJurisprudenceSearchContext()`: Genera un contexto técnico de petición anónima (`actorReference: "public_anonymous"`).

4. **Proyecciones de Allowlist** (`lib/jurisprudence-public-search-projection.ts`):
   - `projectSearchMatchToPublicItem()`: Mapea únicamente 12 campos autorizados para búsquedas públicas.
   - `projectReadModelToPublicItem()`: Mapea únicamente 12 campos autorizados para el detalle público.

## Pruebas de Unidad e Integración

- `tests/phase-11-p-configured-public-search-gateway.test.ts`: Valida el comportamiento del gateway configurado, las proyecciones allowlist y el manejo de errores.
- `tests/phase-11-p-public-search-actions.test.ts`: Valida las Server Actions, la evaluación de readiness y la inmutabilidad de la frontera cliente/servidor.
