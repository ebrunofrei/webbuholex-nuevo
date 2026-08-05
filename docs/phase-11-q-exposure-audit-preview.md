# Fase 11.Q: Auditoría de Exposición Jurisprudencial

## Resumen

Esta fase implementa una previsualización aislada, determinista y de solo lectura (Fase 11.Q) que permite simular qué datos serían públicamente expuestos en una hipotética ruta de detalle de jurisprudencia.

El objetivo principal es permitir una evaluación de seguridad y cumplimiento legal sobre los campos proyectados, confirmando que:

- Los identificadores internos no se exponen.
- La allowlist vigente se reutiliza.
- Los bloqueos de publicación (estado editorial, autorizaciones faltantes, retiro, etc.) se evalúan correctamente.
- No se modifican los contratos preexistentes (como `BL-LEG-CON-001`).
- Todo el entorno permanece desconectado y sin endpoints HTTP reales.

## Contratos

Los nuevos contratos se localizan en `types/jurisprudence-exposure-audit.ts` e incluyen el resultado principal `JurisprudenceExposureAuditResult`, así como los bloqueos y alertas pertinentes.

## Componente de Previsualización

El componente `ExposureAuditPreviewCard` presenta de manera visual la auditoría de exposición en un entorno protegido (panel administrativo / simulación aislada), indicando expresamente que "no existen efectos operativos" y que "no está conectado". No incluye acciones mutables.

## Pruebas de Auditoría

Se incorporaron casos de prueba para garantizar:

1. Determinismo y no mutabilidad del input.
2. Identificación correcta de campos incluidos y excluidos.
3. Bloqueos adecuados para documentos incompletos, sin autorización, retirados o supersedidos.
4. Ausencia de llamadas de red o persistencia de base de datos.
