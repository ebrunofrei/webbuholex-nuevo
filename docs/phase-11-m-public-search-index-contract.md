# Contrato del índice 11.M

Estado: aprobado. La única fuente aceptada es `JurisprudencePublicReadModel` de 11.L. El documento usa lista blanca, estados cerrados, revisión optimista, historial append-only e idempotencia. Preparación e indexación son operaciones explícitas y separadas.

Read model ≠ documento de índice. Documento preparado ≠ documento indexado. Documento indexado ≠ búsqueda pública. Resultado interno ≠ página pública. Página pública ≠ indexación externa. Indexación externa ≠ despliegue.

No existe índice productivo, endpoint, UI, motor externo o dato real.
