# ADR-001: Jurisprudence Public Boundary

## Decisión
- **Direct jurisprudence_internal access = prohibited**
- **Publication barrier bypass = prohibited**

## Justificación y Consecuencias

La frontera pública de Jurisprudencia es estricta. Si un registro no forma parte de la proyección pública de Jurisprudencia, Owl/Hermes no puede obtenerlo a través del dominio de Jurisprudencia ni mediante acceso directo a sus repositorios o tablas internas.

La arquitectura de integración requerida es:
`Owl/Hermes -> application-owned jurisprudence port -> public read/search`

No se admite que ninguna capacidad futura de orquestación (bajo el working name Hermes u otro) eluda este contrato.
