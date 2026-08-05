# ADR-024 — Índice jurisprudencial y puerta de consulta

Estado: aprobado — índice interno determinista y puerta contractual de consulta validados; sin búsqueda pública, endpoint, UI, indexación externa ni despliegue.

## Decisión validada

Se mantiene un índice separado del read model, alimentado exclusivamente desde 11.L mediante lista blanca. Se validaron normalización determinista, ranking cerrado y explicable, filtros estructurados, paginación por offset, preparación e indexación explícitas, retiro, supersesión, historial append-only, idempotencia, concurrencia optimista, memoria y SQLite.

Read model ≠ documento de índice. Documento preparado ≠ documento indexado. Documento indexado ≠ búsqueda pública. Resultado interno ≠ página pública. Página pública ≠ indexación externa. Indexación externa ≠ despliegue.

## Exact optional properties

El transform de consulta dejó de devolver directamente el objeto Zod y ahora omite materialmente toda propiedad opcional ausente mediante spreads condicionales. La corrección conservó esquema, filtros, fechas, normalización, ranking, orden y paginación y fue cubierta por regresiones específicas.

## Evidencia

- Copia física equivalente: `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-m`.
- SHA-256 coincidentes: esquema `48DE56F17938D84DDF37A543F6BD771032175D5367097CF8D6AE54100438CC50`; suite `4EE43B536EA13D9A20485D194C92C7D2BDBB56918DF2D9DAE66B98C61AC04006`.
- Typecheck y Vitest focalizados: código 0; 1 archivo y 26 pruebas.
- Lint, typecheck, test y build: código 0.
- 45 archivos, 688 pruebas y 46/46 páginas.

Se observaron como no bloqueantes la advertencia experimental de SQLite, el aviso jsdom de canvas y el aviso `act(...)` de LinkComponent.

No existen IA, embeddings, RAG, motor externo, scraping, OCR, endpoint, UI, integración del índice en sitemap/robots, publicación o despliegue. El rollback consiste en cerrar y eliminar el índice local sin alterar 11.L.
