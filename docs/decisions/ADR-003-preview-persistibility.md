# ADR-003: Preview Persistibility

## Decisión
El proceso de preview evalúa el registro normalizado contra el contrato estricto de persistencia sin delegar responsabilidades al almacenamiento físico.

Se congelan las siguientes reglas:
- `preview validates normalized object directly against jurisprudenceNewRecordSchema` sin usar `synthetic IDs`, `synthetic versions` o `synthetic timestamps`.
- `preview_ready significa que el objeto normalizado conforma al contrato canónico persistible jurisprudenceNewRecordSchema en ese momento.`
- `preview_ready does NOT guarantee physical database write success` debido, entre otros factores, a: concurrency, version conflicts, database availability, infrastructure failure, durable conflicts discovered at write time.

## Manejo en Zod
Al derivar `jurisprudenceNewRecordSchema` mediante `omit()`, los refinements relevantes del schema original no quedaban conservados/reaplicados automáticamente para este contrato derivado. Por ello se extrajeron reglas compartidas y se aplicaron explícitamente mediante la estrategia observable en código (superRefine / helper compartido).
