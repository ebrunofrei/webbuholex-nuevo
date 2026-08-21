# ADR-002: Resolution Number Nullable

## Decisión
El campo `resolutionNumber` es nullable en el modelo canónico y persistencia.

La justificación fundamental es representar fielmente la ausencia real de un número de resolución independiente sin inventar ni reutilizar `caseNumber`.

## Reglas de Validación
- `ingestion omission / undefined -> normalization -> canonical resolutionNumber = null`
- `explicit null in ingestion input = rejected`
- `empty string = rejected`
- `whitespace-only string = rejected`
- `valid non-empty string = retained`

## Proyección Pública y Base de Datos
- `public detail omits resolutionNumber when canonical value is null`
- `migration 0029 = CODE_AVAILABLE`
- `APPLIED_TO_STAGING = NOT_CONFIRMED`
