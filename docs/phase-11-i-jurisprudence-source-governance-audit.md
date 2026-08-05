# Auditoría de gobierno de fuentes — Fase 11.I

## Alcance auditado

Se revisaron los contratos canónicos de 11.A, el repositorio y la identidad de 11.B, `JurisprudenceInternalApi` de 11.C, la política no montada de 11.E, el pipeline de ingesta de 11.G y el workflow editorial, su historial y sus adaptadores de 11.H. También se revisaron `package.json`, `pnpm-lock.yaml`, `app`, `components`, `data`, middleware, pruebas y ADR previos.

## Capacidades reutilizables

- 11.C ofrece lectura interna del registro y su versión sin exponer persistencia.
- 11.H ofrece lectura del expediente editorial, estado derivado, observaciones bloqueantes y versión.
- Los patrones de puerto, eventos append-only, idempotencia y transacción SQLite de 11.H son reutilizables.
- Las reglas de publicación de 11.A siguen siendo una evaluación distinta y no una autorización.

## Capacidades ausentes antes de 11.I

No existían un registro gobernado de fuente, vínculo fuente–registro–versión, evaluación contractual de procedencia, integridad, derechos y privacidad, ni expediente separado para una futura decisión institucional.

## Riesgos

1. Confundir checksum con autenticidad jurídica.
2. Tratar una fuente secundaria como primaria.
3. Interpretar ausencia de prohibición como derecho de publicación.
4. Heredar vínculos o evaluaciones entre versiones.
5. Convertir `verified_for_publication_evaluation` en autorización.
6. Filtrar datos sensibles, URLs completas, hashes o errores de SQLite.
7. Montar rutas antes de autenticación y gobierno productivo.

## Límite adoptado

```text
consumidor interno
  → JurisprudencePublicationGovernanceService
  → JurisprudenceInternalApi + lectura de JurisprudenceEditorialWorkflow
  → JurisprudencePublicationDossierRepository
  → memoria o SQLite local de pruebas
```

No se incorporan fuentes o registros reales. No existe adquisición, OCR, IA, endpoint, UI, autorización o ejecución de publicación.

## Cierre oficial

La auditoría y su implementación asociada quedan aprobadas tras la validación de la copia externa física y equivalente. Se verificaron 21 de 21 archivos y hashes SHA-256, 41 archivos de prueba, 570 pruebas, 37 pruebas específicas de 11.I y 46 de 46 páginas generadas. El cierre no incorpora fuentes o datos reales ni habilita autorización, ejecución de publicación, endpoints o UI.
