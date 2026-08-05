# ADR-025 — Experiencia pública de búsqueda jurisprudencial

**Estado:** approved.

## Decisión

La página `/jurisprudencia` dependerá de un gateway público neutral y read-only. El gateway predeterminado será no configurado; no podrá consultar el índice 11.M, repositorios o red. La UI validará consultas mediante Zod estricto y mostrará únicamente campos públicos de lista blanca.

Se difiere la ruta de detalle por slug hasta que exista autorización específica para ampliar la superficie. El contrato de lectura queda preparado sin crear contenido.

## Separaciones vinculantes

- índice interno ≠ gateway público;
- gateway público ≠ endpoint HTTP;
- endpoint HTTP ≠ conexión productiva;
- interfaz visible ≠ datos reales disponibles;
- resultado ficticio de prueba ≠ jurisprudencia publicada;
- página pública ≠ indexación externa;
- indexación externa ≠ despliegue.

## Consecuencias

La interfaz puede ser evaluada con fixtures ficticios inyectados, pero el estado real presenta `not_configured`. No existen endpoints, datos reales, autenticación, sitemap jurisprudencial productivo, publicación o despliegue.

## Validación oficial

La validación técnica externa se ejecutó y acreditó sobre copia física externa. Resultados oficiales:

- Validación focalizada de 11.N: Typecheck código 0; Vitest código 0; Test Files 1 passed (1); Tests 21 passed (21).
- Validación de regresión focalizada adicional: Test Files 4 passed (4); Tests 47 passed (47).
- Validación global definitiva: pnpm lint código 0; pnpm typecheck código 0; pnpm test código 0; pnpm build código 0; Test Files 46 passed (46); Tests 709 passed (709); Generating static pages (46/46); Compiled successfully.

Advertencias no bloqueantes registradas:
- ExperimentalWarning: SQLite is an experimental feature and might change at any time.
- HTMLCanvasElement.getContext() not implemented in jsdom.
- LinkComponent updates not wrapped in act(...).

`outputCompletelyWarningFree: false`

## Estado oficial registrado

- `overallStatus: approved`
- `officialValidationApproved: true`
- `validationPending: false`
- `implementationStatus: validated_closed`

Permanecen obligatoriamente en false: `realSearchGatewayConfigured`, `realJurisprudenceDataPresent`, `publicSearchConnectedToRealData`, `searchEndpointMounted`, `detailRouteMounted`, `authenticationReal`, `externalIndexingEnabled`, `published`, `deployed`.
