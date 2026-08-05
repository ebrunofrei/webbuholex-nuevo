# Normalización, huellas y deduplicación — Fase 11.G

## Normalización determinista

Los metadatos admitidos se normalizan con NFC, trim y colapso de espacios internos. Las listas sin significado ordinal —keywords, tags, materias, órganos e identificadores relacionados— se limpian, deduplican y ordenan. Las fechas siguen los esquemas ISO existentes.

No se resumen ni reinterpretan sumillas, texto oficial, fundamentos, citas o decisión. Zod puede retirar espacios exteriores por contrato, pero no cambia palabras, puntuación, saltos internos ni orden jurídico.

## Tres referencias separadas

1. `sourceChecksum`: SHA-256 del contenido local original declarado.
2. `normalizedRecordFingerprint`: SHA-256 de una serialización estable del registro normalizado; el checksum de fuente persistido se neutraliza para no confundir contenido con procedencia.
3. `jurisprudenceIdentityKey`: clave explicable construida mediante la identidad externa aprobada en 11.B: tipo/documento de fuente, expediente, resolución, institución y fecha.

Un checksum no sustituye identidad jurídica. Un título, parecido parcial o heurística tampoco forma identidad suficiente.

## Clasificación de coincidencias

- repetición de idempotency key, checksum, fingerprint o identidad dentro del lote → `duplicate_in_batch` con causa explícita;
- identidad ya persistida y contenido igual → `unchanged`;
- identidad persistida y creación solicitada con contenido distinto → `duplicate_existing`;
- target o versión incompatibles → `conflict`;
- actualización compatible → `preview_ready` y confirmación posterior.

Ningún conflicto se resuelve automáticamente y no existe sobrescritura aproximada.
