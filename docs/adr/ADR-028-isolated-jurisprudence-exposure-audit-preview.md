# ADR 028: Isolated Jurisprudence Exposure Audit Preview

## Status
Accepted

## Context
Concluida la Fase 11.P (Gateway Público), la aplicación cuenta con un flujo completo de publicación de jurisprudencia y una proyección técnica de búsqueda que permanece restringida y no montada en HTTP.
Antes de abrir una ruta pública para la visualización del detalle de la jurisprudencia, el comité legal e institucional requiere la capacidad de auditar exactamente qué información se va a proyectar públicamente (Fase 11.Q).

Esta auditoría debe ejecutarse contra fixtures estáticos, sin tocar bases de datos reales ni exponer la aplicación.

## Decision
Se decide implementar un módulo de previsualización puramente de solo lectura y determinista (Fase 11.Q), que reutilice la infraestructura de proyección `projectReadModelToPublicItem` ya existente, pero limitándose a reportar el resultado de la proyección.

- **Solo lectura**: No muta base de datos, no tiene endpoints HTTP, y sus componentes no contienen botones de acción.
- **Auditoría Estricta**: La función de previsualización compara los campos del `ReadModel` (entidad completa) frente a la `PublicProjection` generada, reportando `includedFields` (permitidos) y `excludedFields` (excluidos/sensibles).
- **Control de Bloqueos**: Simula el entorno evaluando bloqueos documentales como `resolución retirada`, `dossier incompleto` o `autorización institucional ausente`.

## Consequences
**Positivas:**
- Otorga visibilidad completa a los revisores humanos sin arriesgar exposición real.
- Reutiliza la `allowlist` actual de proyección de 12 campos públicos autorizados.
- Garantiza que la arquitectura no sufra alteraciones (no HTTP, no DB writes).

**Negativas:**
- Requiere alimentar el componente desde una fuente estática o una capa simulada en el desarrollo, lo que limita la inyección dinámica si no se configura explícitamente como "solo simulador".

## Validation
- Ejecución completa de tests demostrando ausencia total de fuga de identificadores.
- `ExposureAuditPreviewCard` carece de comportamientos de servidor.
