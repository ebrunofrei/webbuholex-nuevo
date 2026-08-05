# Contrato Público de Detalle Jurisprudencial (Fase 11.O)

## Especificación de Interfaz
La ruta pública `/jurisprudencia/[slug]` consume exclusivamente `JurisprudencePublicSearchGateway.getBySlug(slug: string)`.

### Respuestas Permitidas
* `success`: Contiene `item: JurisprudencePublicSearchItem`.
* `not_found`: Resolución no encontrada en el catálogo.
* `not_configured`: Gateway no habilitado para consultas públicas.
* `error`: Error controlado estático.

### Validación de Slug
Se aplica `jurisprudencePublicSlugSchema` previamente a cualquier consulta. Slugs inválidos generan el estado `invalid_slug` sin invocar el gateway.
