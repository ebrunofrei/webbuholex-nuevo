# ADR-026: Ruta Pública Contractual de Detalle Jurisprudencial

## Estatus
Aceptado (Fase 11.O)

## Contexto
Se requiere habilitar la ruta pública de detalle `/jurisprudencia/[slug]` garantizando aislamiento total con la infraestructura productiva y la preservación de la privacidad.

## Decisión
1. Consumir exclusivamente `JurisprudencePublicSearchGateway.getBySlug(slug)`.
2. Validar previamente con `jurisprudencePublicSlugSchema`.
3. Renderizar únicamente los 12 campos de la lista blanca `JurisprudencePublicSearchItem`.
4. Mantener la aplicación en *default deny* utilizando `UnconfiguredJurisprudencePublicSearchGateway`.
5. Asegurar un único `<main>` y un único `<h1>` en el árbol renderizado.

## Consecuencias
* La ruta está funcionalmente implementada y desacoplada.
* Se garantiza la ausencia de filtración de datos privados, SQL o trazas de excepción.
