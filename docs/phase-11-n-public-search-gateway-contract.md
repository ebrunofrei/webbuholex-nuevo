# Fase 11.N — Contrato del gateway público

`JurisprudencePublicSearchGateway` es un puerto read-only con dos operaciones: `search(query)` y `getBySlug(slug)`. Solo devuelve modelos públicos de lista blanca.

Las respuestas son discriminadas: `success`, `empty`, `not_configured`, `invalid_query` y `error`; el detalle admite `success`, `not_found`, `not_configured` y `error`. Ninguna respuesta contiene IDs de autorización o ejecución, hashes, actores, observaciones, eventos, SQL, rutas, secretos o datos personales.

La implementación real inicial es `UnconfiguredJurisprudencePublicSearchGateway`. Es determinista, no consulta infraestructura, no hace `fetch`, no lee entorno y no inventa resultados. El gateway ficticio existe únicamente dentro de la suite.

Separaciones:

- índice interno ≠ gateway público;
- gateway público ≠ endpoint HTTP;
- endpoint HTTP ≠ conexión productiva;
- resultado ficticio de prueba ≠ jurisprudencia publicada.
