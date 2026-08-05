# ADR-027: Conexión Controlada del Gateway Público Jurisprudencial (Fase 11.P)

## Estatus
Aprobado (Implementación Dormant / Default Deny)

## Contexto
En las Fases 11.L y 11.M se establecieron los repositorios de Read Model público y el servicio de índice de búsqueda jurisprudencial interno. En las Fases 11.N y 11.O se desarrollaron las experiencias públicas de búsqueda y detalle con un gateway desconfigurado.

Para la Fase 11.P, se requiere implementar la infraestructura contractual y técnica que conecte las Server Actions públicas con la capa interna de búsqueda (11.M) y el repositorio de read model (11.L), garantizando que la conexión productiva permanezca deshabilitada por defecto (`activationAuthorized = false`).

## Decisiones de Arquitectura

1. **Gateway Configurado de Servidor (`ConfiguredJurisprudencePublicSearchGateway`)**:
   - `search(query)` delega en `JurisprudencePublicSearchIndexService.search()` (11.M) e inyecta un `JurisprudencePublicExposureContext` anónimo.
   - `getBySlug(slug)` delega en `JurisprudencePublicReadModelRepository.findActiveBySlug()` (11.L).
   - Proyección pública estricta vía allowlist explicito (`projectSearchMatchToPublicItem` y `projectReadModelToPublicItem`) filtrando cualquier identificador o metadato interno.

2. **Frontera Cliente/Servidor mediante Server Actions**:
   - Las Server Actions (`searchPublicJurisprudenceAction` y `getPublicJurisprudenceBySlugAction`) actúan como la única frontera expuesta a los Client Components.
   - Verifican la readiness de activación mediante `evaluateJurisprudencePublicSearchActivationReadiness()`.
   - Cuando `activationAuthorized` es `false`, devuelven inmediatamente `status: "not_configured"`.
   - El gateway configurado no se instancia cuando el readiness es falso.

3. **Client Components y Seguridad**:
   - Los Client Components no reciben objetos gateway con métodos.
   - Los Client Components no importan SQLite, repositorios ni servicios internos.
   - Manejo centralizado de excepciones con respuestas sanitizadas (sin stack traces ni detalles SQL).

4. **Inmutabilidad y Flags Productivos**:
   - No se crean endpoints HTTP nuevos ni archivos en `app/api/` o `route.ts`.
   - `sitemap.ts`, `robots.ts` y `middleware.ts` permanecen intactos.
   - Todos los flags productivos permanecen en `false`.

## Consecuencias
- Cero fugas de información interna hacia componentes de cliente.
- Transición segura y desacoplada para habilitar búsquedas reales en fases futuras mediante cambio controlado de flags sin reescritura de código de cliente.
