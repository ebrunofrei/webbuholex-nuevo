# ADR-004: Owl / Hermes Boundary

## Contexto y Nomenclatura
- **Owl remains bounded context**
- **Hermes does not become a duplicate domain**
- **NAMING_MIGRATION_REQUIRED = NO**

Owl permanece como bounded context de la experiencia de análisis jurídico y de sus contratos de aplicación. Hermes es un architectural working name para futuras capacidades de ejecución/orquestación dentro de la evolución de Owl. Si esas capacidades se materializan, no deben formar un dominio duplicado.

## Principios de Control e Interacción
- `LLM proposes`
- `Application verifies`
- `Domain decides`
- `Guards permit or reject`
- `LLM citation != verified citation`

## Integración con Jurisprudencia
La integración futura entre la experiencia inteligente y Jurisprudencia se rige por:
`Owl application-owned jurisprudence port -> Jurisprudence public read/search`

No se permite el acceso directo a:
- `jurisprudence_internal`
- `internal repositories`
- `internal tables`
- `publication barrier bypass`
