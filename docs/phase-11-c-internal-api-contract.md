# Contrato de la API interna jurisprudencial

No existen URLs ni endpoints. Todas las operaciones son métodos TypeScript exclusivos del servidor y usan excepciones `JurisprudenceApplicationError`.

| Operación | Entrada | Salida | Errores principales |
|---|---|---|---|
| `createRecord` | contexto, idempotencyKey, registro nuevo | resultado de creación | validación, duplicado, idempotencia, repositorio |
| `updateRecord` | contexto, id, expectedVersion, changeKind, registro completo | resultado de actualización | validación, no encontrado, versión, duplicado |
| `getInternalRecord` | contexto, id | detalle interno sanitizado | validación, no encontrado |
| `getInternalRecordBySlug` | contexto, slug | detalle interno sanitizado | validación, no encontrado |
| `getInternalRecordByIdentity` | contexto, identidad externa | detalle interno sanitizado | validación, no encontrado |
| `getVersionHistory` | contexto, id | historial con snapshots sanitizados | validación, no encontrado |
| `evaluatePublication` | contexto, id | publicable, bloqueos, versión y fecha | validación, no encontrado |
| `listInternalRecords` | contexto y filtros paginados opcionales | página de resúmenes internos | validación, repositorio |
| `searchInternalRecords` | contexto, q y filtros paginados | página de resúmenes internos | validación, repositorio |
| `countInternalRecords` | contexto y filtros | total interno | validación, repositorio |
| `searchPublicRecords` | contexto y `JurisprudenceSearchInput` | `JurisprudenceSearchResult` | validación, repositorio |
| `getPublicDetail` | contexto y slug | `found` con `JurisprudenceDetail` o `not_found` | validación, repositorio |
| `close` | contexto | void | recurso o repositorio |

## Códigos

`VALIDATION_ERROR`, `NOT_FOUND`, `NOT_PUBLIC`, `DUPLICATE_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `VERSION_CONFLICT`, `PUBLICATION_BLOCKED`, `REPOSITORY_UNAVAILABLE`, `RESOURCE_CLOSED` e `INTERNAL_ERROR`.

`NOT_PUBLIC` se conserva para auditoría interna; `getPublicDetail` no lo expone y devuelve `not_found` tanto para ausentes como para privados.

## Garantías

- no se devuelve el repositorio ni el adaptador;
- no se acepta SQL, rutas o archivos;
- no se elevan estados;
- idempotencia y versión son obligatorias;
- las proyecciones públicas no incluyen campos internos;
- no hay efectos laterales al importar;
- la conexión se abre una vez por factory y se cierra explícitamente.
