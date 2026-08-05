# Fase 11.B — Auditoría de persistencia

## Arquitectura revisada

La auditoría se realizó antes de añadir la capa de repositorio. Se revisaron `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, Node y pnpm instalados, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore`, `middleware.ts`, las estructuras `lib/`, `data/`, `types/`, `tests/`, documentación y superficies de servidor.

Entorno comprobado:

- Node.js `v22.16.0` y pnpm `11.9.0`;
- Next.js 15.5.9 con App Router;
- TypeScript estricto, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`;
- Zod 4.1.13;
- Vitest con jsdom;
- Windows local con antecedente `EPERM` sobre ejecutables dentro del `node_modules` del árbol original;
- copia externa de validación disponible como procedimiento ya aprobado;
- `.env.example` contiene únicamente `SITE_URL`;
- no hay Docker, configuración de Vercel u otra estrategia de despliegue documentada.

## Tecnologías encontradas y ausentes

No existían:

- ORM o query builder;
- Prisma, Drizzle, TypeORM, Sequelize o Mongoose;
- cliente PostgreSQL, SQLite o MongoDB;
- migraciones;
- repositorios;
- almacenamiento local estructurado;
- `DATABASE_URL`;
- rutas API, route handlers o Server Actions;
- infraestructura de producción definida.

Las únicas dependencias de aplicación son Next.js, React, React DOM y Zod. `package.json` y `pnpm-lock.yaml` no se modifican en 11.B.

Node 22.16 expone `node:sqlite`. Se ejecutó una prueba real con `DatabaseSync`, creación de tabla, inserción, consulta y cierre correctos. Node emitió `ExperimentalWarning: SQLite is an experimental feature and might change at any time`.

## Alternativas evaluadas

### PostgreSQL con ORM o query builder

Es la alternativa preferida para una producción futura por transacciones, índices, concurrencia, migraciones y evolución hacia búsqueda. Se difiere porque no existe instancia, `DATABASE_URL`, estrategia de despliegue ni dependencia aprobada. Añadir un ORM ahora fijaría decisiones operativas no cerradas y agravaría el riesgo de instalación bajo `EPERM`.

### SQLite local

Es estable como archivo local y permite probar persistencia real, transacciones, índices, reapertura e historial sin servicio externo. Node 22.16 ofrece el driver nativo sin dependencia adicional. Se adopta como adaptador inicial local y de pruebas, con WAL para archivos y `busy_timeout`; no se declara base definitiva de producción debido a la advertencia experimental del módulo, su concurrencia de escritor único y la falta de almacenamiento persistente definida para despliegue.

### MongoDB

No aporta ventaja suficiente frente a la necesidad de unicidad, control optimista, transacciones e índices compuestos. Exigiría servicio y dependencia nuevos. Se descarta para este corte.

### Adaptador solo en memoria

Es necesario como referencia contractual y para pruebas unitarias, pero no demuestra persistencia entre procesos. Se implementa, pero no se usa como justificación de persistencia real.

### Archivos JSON

Se descartan como base de producción: no ofrecen transacciones robustas, índices, concurrencia ni migraciones seguras. JSON se usa únicamente como representación interna del payload dentro de una fila SQLite validada y acompañada por columnas indexables.

## Decisión adoptada

1. Puerto `JurisprudenceRepository` independiente de tecnología.
2. Adaptador en memoria para contrato y comparación.
3. Adaptador SQLite local real mediante `node:sqlite`.
4. Modelo físico con filas de registro, historial e idempotencia.
5. Payload canónico completo en JSON validado, acompañado de columnas indexables y verificadas contra el payload al reconstruir.
6. PostgreSQL queda como candidato de producción para una decisión posterior.

## Riesgos del entorno

- `node:sqlite` genera advertencia experimental en Node 22.16.
- SQLite usa escritor único; WAL mejora lectores/escritor, no sustituye una estrategia multiinstancia.
- el archivo local no es apropiado para runtimes efímeros o múltiples instancias sin volumen compartido;
- el árbol original puede impedir iniciar lint o Vitest por `EPERM` sin que ello sea un defecto del código;
- no existe backup, cifrado, retención ni gestión operativa aprobada;
- no se ha definido la política de datos personales ni el acceso editorial real.

## Impacto en dependencias y configuración

- `package.json`: sin cambios.
- `pnpm-lock.yaml`: sin cambios.
- `.env.example`: sin cambios; el adaptador recibe una ruta explícita del consumidor interno o del test.
- `.gitignore`: ampliado para excluir `*.sqlite`, journals, SHM y WAL.

## Límites

No se conecta `/jurisprudencia`, no se crea API, no se ingieren datos, no se almacenan PDFs, no se añade autenticación, no se publica y no se despliega. Los únicos registros de prueba viven bajo `tests/`, son ficticios, privados y no verificables.
