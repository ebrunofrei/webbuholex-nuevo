# Fase 11.A — Auditoría del dominio jurisprudencial existente

## Alcance y método

La auditoría se realizó sobre el árbol local de BúhoLex v2 antes de crear el contrato canónico. Se inspeccionaron la configuración, el mapa de rutas, las superficies jurisprudenciales, los contratos cognitivos, los esquemas, los datos demostrativos y las pruebas relacionadas. No se consultaron portales externos ni se incorporaron resoluciones.

## Estructura encontrada

- Next.js 15.5.9 con App Router y React 19.1.1.
- TypeScript 5.9.3 en modo `strict`, con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`.
- Zod 4.1.13 para validación de contratos.
- Vitest 4.0.14, Testing Library, jsdom y `vitest-axe` para pruebas.
- Alias interno `@/*`; tipos en `types/`; esquemas en `lib/schemas/`; datos tipados en `data/`; reglas puras en `lib/`.
- Un único `middleware.ts`, limitado al guard de `/app/:path*`.
- No existen `route.ts`, rutas API, Server Actions, repositorios, ORM, migraciones ni una base de datos.
- `package.json` y `pnpm-lock.yaml` son coherentes en versiones y no se modifican en esta fase.

## Archivos revisados

### Configuración y arquitectura

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
- `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`.
- `middleware.ts`, `app/layout.tsx`, `components/site-frame.tsx`.
- Mapa de `app/`, `components/`, `data/`, `lib/`, `types/` y `tests/`.

### Jurisprudencia

- `app/jurisprudencia/page.tsx`.
- `app/asistente/page.tsx`, `app/espacio/page.tsx`, `app/app/jurisprudencia/page.tsx`.
- `components/jurisprudence/jurisprudence-public-page.tsx`.
- `components/jurisprudence/jurisprudence-assisted-demo.tsx`.
- `components/jurisprudence/intelligent-space-jurisprudence.tsx`.
- `components/jurisprudence/jurisprudence.module.css`.
- `types/jurisprudence.ts`, `types/jurisprudence-analysis.ts`, `types/domain.ts`.
- `lib/schemas/jurisprudence.ts`, `lib/schemas/jurisprudence-analysis.ts`.
- `lib/jurisprudence-guards.ts`.
- `data/jurisprudence-cognitive.ts`.
- Documentos `docs/jurisprudence-*` y `docs/phase-10-b-jurisprudence-assistant.md`.

### Pruebas relacionadas

- `tests/jurisprudence-interface.test.tsx`.
- `tests/jurisprudence-cognitive.test.ts`.
- `tests/assistant-contracts.test.ts`.
- `tests/routes.test.ts`.
- `tests/accessibility.test.tsx`.
- `tests/phase-10-b-visual-contract.test.ts`.
- `tests/site-frame.test.tsx`, `tests/portal-routes.test.tsx` y `tests/workspace-guard.test.ts`.

## Comportamiento real de `/jurisprudencia`

La ruta es una interfaz pública demostrativa. Permite escribir una consulta local y activar un estado informativo; no ejecuta una búsqueda. El mensaje visible declara que todavía no existen resoluciones verificadas publicadas y que no se muestran resultados simulados.

La página consume únicamente:

- una lista conceptual de instituciones oficiales prioritarias;
- cinco modos demostrativos de jurisprudencia asistida;
- un arreglo de documentos demostrativos vacío.

La interfaz muestra un campo de problema jurídico. Los demás filtros mencionados —especialidad, materia, submateria, órgano y verificación— son una intención de diseño, no controles ni consultas implementadas. La acción «Abrir fuente oficial» lleva a la sección explicativa de fuentes; no abre una resolución. Las funciones avanzadas llevan a `/iniciar-sesion/` y no procesan documentos.

Estados existentes:

- consulta vacía;
- botón de búsqueda deshabilitado hasta alcanzar el mínimo local;
- consulta preparada sin datos publicados;
- pestañas demostrativas pública/premium;
- ausencia deliberada de carga, error y resultados, porque no hay repositorio.

## Contratos implícitos existentes

1. `JurisprudenceDocument` representa un documento ya segmentado para el flujo cognitivo; no contiene estados editoriales y de publicación independientes.
2. `JurisprudenceOfficialSource` exige URL canónica y refleja estados de ingesta, no toda la evidencia editorial posible.
3. `JurisprudenceQuery` representa modos del asistente, no filtros paginados de búsqueda pública.
4. `JurisprudenceResult` combina documento y pertinencia cognitiva; no es una proyección pública segura.
5. `JurisprudenceAnalysisResult` separa análisis, citas, fuentes y límites, y exige fuentes verificadas.
6. Los guards existentes impiden criterios verificados sin citas, páginas inválidas, instituciones contradictorias e inferencias presentadas como contenido oficial.
7. Los adaptadores están deshabilitados y prohíben scraping, elusión de CAPTCHA, endpoints privados y descargas masivas repetidas.

## Inconsistencias y riesgos

- No existía un registro canónico que separara estado editorial, estado de publicación y estado de verificación.
- El tipo heredado `JurisprudenceItem` de `types/domain.ts` era una proyección mínima no usada, con URL obligatoria y sin control editorial; se retiró para evitar dos contratos públicos incompatibles.
- `bindingStatus` distinguía `binding`, `persuasive`, `not_binding` y `undetermined`, pero no separaba categoría de resolución, autoridad jurídica, vigencia y evidencia.
- `JurisprudenceSection` separa extracto oficial y resumen del sistema, pero no existía una separación canónica entre texto oficial, resumen editorial, extracto público y borrador generado.
- La fuente cognitiva exige URL; el dominio editorial necesita admitir evidencia autorizada sin URL pública, sin permitir verificación sin respaldo.
- La estructura global actual produce un `<main>` en `SiteFrame` y otro dentro de `JurisprudencePublicPage`. Es una deuda semántica de interfaz previa; no se corrige en 11.A porque no se conecta ni modifica la UI.
- La interfaz anuncia filtros futuros que todavía no existen. No debe interpretarse como disponibilidad de búsqueda real.
- Los nombres de instituciones son catálogo conceptual; no constituyen registros jurisprudenciales ni prueban conectividad.
- No existe aún política aprobada de minimización o anonimización de datos personales contenidos en resoluciones.

## Elementos reutilizables

- Instituciones y clases de fuente del flujo cognitivo, como referencia de adquisición futura.
- Estados de ingesta y política de fuentes oficiales.
- Segmentación, citas, problemas jurídicos y holdings para una fase posterior de procesamiento.
- Guards de citas y páginas.
- Separación entre contenido oficial, resumen del sistema, inferencia, aplicabilidad y limitaciones.
- Interfaz honesta sin resultados y pruebas que impiden jurisprudencia ficticia.

## Decisión de ubicación

Se conserva la organización vigente:

- contrato tipado canónico en `types/jurisprudence.ts`;
- esquemas Zod en `lib/schemas/jurisprudence.ts`;
- funciones puras de publicación, normalización y proyección en `lib/jurisprudence-domain.ts`.

No se crea `lib/jurisprudence/` porque el proyecto usa actualmente módulos planos para reglas (`jurisprudence-guards.ts`, `product-package-integrity.ts`) y una carpeta exclusiva para esquemas. El contrato canónico se denomina `JurisprudenceRecord`; el contrato cognitivo `JurisprudenceDocument` permanece separado.

## Decisiones pendientes

- motor y esquema de persistencia;
- repositorio y transacciones;
- política de identificadores externos y deduplicación;
- ingesta autorizada y conservación de evidencia;
- almacenamiento privado y permisos de archivos;
- política de datos personales y anonimización;
- revisión editorial y roles reales;
- API, límites de uso, caché y observabilidad;
- estrategia de índice y relevancia;
- reglas específicas por institución y tipo de resolución;
- autorización para exponer texto completo y archivos;
- migración del formulario público al contrato de búsqueda;
- corrección semántica del doble `main` al intervenir la UI.
