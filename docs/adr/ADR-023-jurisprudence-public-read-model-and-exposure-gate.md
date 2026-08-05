# ADR-023 — Read model público y puerta de exposición jurisprudencial

Estado: aprobado — read model público y puerta de exposición validados; sin exposición real, búsqueda pública, indexación ni despliegue.

## Decisión

Mantener un read model de lista blanca y un agregado de exposición separados de la proyección interna de 11.K. Preparación, exposición ficticia local, retiro y supersesión requieren comandos explícitos, historial append-only, idempotencia y concurrencia optimista. Memoria y SQLite son adaptadores de prueba; SQLite no constituye infraestructura productiva.

Se mantienen estas separaciones:

- Proyección interna ≠ read model público.
- Read model público preparado ≠ exposición pública.
- Exposición pública activa ≠ indexación.
- Indexación ≠ despliegue.
- Una exposición ficticia dentro de pruebas no constituye exposición real.

## Corrección validada

`JurisprudencePublicExposureIdempotencyEntry` estaba importado y no usado en el adaptador SQLite, generando `@typescript-eslint/no-unused-vars`. Se retiró únicamente ese import; no cambiaron SQL, transacciones, clases, métodos, contratos, comportamiento ni pruebas.

## Evidencia oficial

- Copia física equivalente: `C:\Users\USER\Documents\Proyectos\buholex-v2-validacion-11-l`.
- `node_modules` físico, sin junction ni enlace simbólico.
- 25/25 archivos presentes y 25/25 hashes coincidentes.
- Archivo corregido con SHA-256 fuente/destino `3B8986D07DBEB25BA526666502F12FBB34FE5680C73C6F7025B709631EAFD456`.
- Typecheck y Vitest focalizados: código 0; 1 archivo y 18 pruebas aprobadas.
- Lint, typecheck, test y build completos: código 0.
- 44 archivos de prueba, 662 pruebas y 46/46 páginas.

Se registraron como no bloqueantes `ExperimentalWarning: SQLite is an experimental feature and might change at any time`, `HTMLCanvasElement.getContext() not implemented in jsdom` y `LinkComponent updates not wrapped in act(...)`.

No existen rutas, endpoints, UI, búsqueda o indexación conectadas. Los indicadores productivos y reales permanecen falsos; no hubo publicación ni despliegue.
