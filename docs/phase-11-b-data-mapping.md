# Fase 11.B — Mapeo de datos jurisprudenciales

## Flujo

`JurisprudenceRecord` → `toJurisprudencePersistedRow` → `jurisprudence_records` → `fromJurisprudencePersistedRow` → `JurisprudenceRecord`

La reconstrucción valida el payload con `jurisprudenceRecordSchema` y compara todas las columnas indexables con los valores derivados. Una divergencia se trata como error de persistencia.

## Mapeo escalar e indexable

| Registro canónico | Columna física |
|---|---|
| `id` | `id` PK |
| `slug` | `slug` UNIQUE nullable |
| `recordVersion` | `record_version` |
| identidad externa derivada | `deduplication_key` UNIQUE |
| `source.type` | `source_type` |
| `source.documentId` normalizado | `source_document_id` |
| `caseNumber` normalizado | `normalized_case_number` |
| `resolutionNumber` normalizado | `normalized_resolution_number` |
| `institution.id` normalizado | `institution_id` |
| `matter` normalizado | `normalized_matter` |
| `search.normalizedSearchText` normalizado | `normalized_search_text` |
| `issuedAt` | `issued_at` |
| `editorialStatus` | `editorial_status` |
| `publicationStatus` | `publication_status` |
| `source.verificationStatus` | `verification_status` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

## Payload completo

`payload_json` conserva sin omitir:

- identidad y estados;
- identificación jurídica;
- institución y órgano;
- contenido oficial;
- contenido editorial;
- contenido generado separado;
- autoridad, categoría y vigencia;
- fuente, evidencia y notas internas;
- contrato futuro de archivo;
- clasificación de búsqueda;
- contradicciones y controles internos.

No se serializan funciones ni conexiones. Los campos JSON no sustituyen las columnas indexables; ambos deben coincidir.

## Historial

`jurisprudence_record_versions` conserva `record_id`, versión, clase de cambio, fecha y snapshot JSON completo. La clave primaria compuesta impide dos snapshots para la misma versión.

## Idempotencia

`jurisprudence_idempotency` conserva la clave, la entrada canónica serializada, el id resultante y la fecha. No reemplaza la deduplicación jurídica.

## Índices

- id y slug únicos;
- clave explicable de deduplicación única;
- tipo/identificador de fuente;
- expediente;
- resolución;
- institución/materia/fecha/id;
- estados/actualización/id.

No existe índice full-text.

## Reconstrucción y errores

JSON inválido, incumplimiento del esquema o diferencia entre sobre indexable y payload produce `PERSISTENCE_ERROR`. No se corrige ni completa silenciosamente un registro dañado.
