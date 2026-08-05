# Fase 10.B — Portal saneado y jurisprudencia cognitiva

## Implementado

- Portal dual conservado con una rejilla de tres zonas que impide superposición entre búho y textos.
- CTA integrados en el flujo y control legal separado del contenido principal.
- `/explorar/` con hero compacto, directorio completo y estados públicos discretos.
- `/iniciar-sesion/` con lenguaje público y tres fronteras limpias.
- Panel legal sin estados editoriales internos repetidos.
- `/asistente/` presentado como demostración local, sin nombres de proveedores ni estados de integración.
- `/jurisprudencia/` con búsqueda pública honesta, arquitectura de lectura y acceso futuro a capacidades avanzadas.
- Cinco modos demostrativos, sin resoluciones ficticias.
- Modelos, esquemas, agentes, skills, guards, flujo de ingesta y adaptadores deshabilitados.
- `/espacio/` ampliado con Jurisprudencia Asistida.
- Diez eventos jurisprudenciales modelados sin envío ni contenido jurídico.

## No implementado

Autenticación, pagos, OpenAI, embeddings, base vectorial, OCR, scraping, conectores, descarga masiva, almacenamiento de resoluciones, analítica externa, publicación, compra y descarga pública.

## Estado comercial preservado

BL-LEG-CON-001 conserva `availabilityStatus: editorial_preview`, precio y moneda nulos, licencia pendiente y autorización de publicación en `false`.

## Validación

### Herramienta oficial

Los cuatro comandos fueron ejecutados en el orden requerido, pero ninguno alcanzó su herramienta por `EPERM`:

- `pnpm lint`: bloqueo al abrir `node_modules/eslint/bin/eslint.js`.
- `pnpm typecheck`: bloqueo al abrir `node_modules/typescript/bin/tsc`.
- `pnpm test`: bloqueo al abrir `node_modules/vitest/vitest.mjs`.
- `pnpm build`: bloqueo al abrir `node_modules/next/dist/bin/next`.

No se modificaron dependencias ni permisos. Estos resultados no prueban ni desaprueban el código. También se intentó `pnpm dev --port 3000`; la nueva ejecución sufrió `EPERM` en `node_modules/next/dist/bin/next`.

### Comprobación alternativa

Una instancia local preexistente sirvió mediante Fast Refresh el grafo actualizado de las seis rutas: `/`, `/explorar`, `/iniciar-sesion`, `/espacio`, `/jurisprudencia` y `/asistente`, todas con HTTP 200. Los controles estáticos registraron:

- cero `any` explícitos en la capa cognitiva;
- cinco modos demostrativos;
- siete agentes;
- doce etapas de ingesta;
- cero patrones de resoluciones ficticias;
- cero rutas privadas, hashes o contrato de cesión en la interfaz pública;
- cero atributos de descarga;
- cero menciones públicas a OpenAI, proveedores o integración;
- estado de BL-LEG-CON-001 preservado: vista previa editorial, precio y moneda nulos, licencia pendiente y publicación no autorizada.

### Auditoría visual real

En viewport 1280 × 720:

- portal sin textos tapados y ambos CTA visibles;
- búho en columna propia;
- cero overflow horizontal en las seis rutas;
- foco visible (`outline` sólido de 3 px);
- panel con `role="dialog"`, cierre por Escape y devolución del foco;
- cero errores y cero advertencias de consola; solo mensajes de desarrollo y Fast Refresh;
- `/asistente` sin lenguaje de proveedores;
- `/jurisprudencia` sin resoluciones simuladas ni datos privados.

El navegador disponible mantiene un viewport fijo de 1280 × 720 y no ofrece emulación de 390 × 844. La vista móvil no se declara auditada visualmente. Se comprobaron de forma estática tres bloques responsive, apilado del portal, búho en fila propia y ausencia de altura fija en las opciones móviles.

## Evidencias

Se generaron nueve capturas y un registro de consola en `outputs/fase-10-b/`. No se creó una captura móvil ficticia.

## Archivos creados

- `types/jurisprudence.ts`
- `data/jurisprudence-cognitive.ts`
- `lib/schemas/jurisprudence.ts`
- `lib/jurisprudence-guards.ts`
- `components/jurisprudence/jurisprudence-assisted-demo.tsx`
- `components/jurisprudence/jurisprudence-public-page.tsx`
- `components/jurisprudence/intelligent-space-jurisprudence.tsx`
- `components/jurisprudence/jurisprudence.module.css`
- `tests/jurisprudence-cognitive.test.ts`
- `tests/jurisprudence-interface.test.tsx`
- `tests/phase-10-b-visual-contract.test.ts`
- `docs/jurisprudence-cognitive-architecture.md`
- `docs/jurisprudence-ingestion-workflow.md`
- `docs/jurisprudence-agent-contracts.md`
- `docs/jurisprudence-access-boundaries.md`
- `docs/jurisprudence-source-adapters.md`
- `docs/phase-10-b-jurisprudence-assistant.md`

## Archivos modificados

- `app/jurisprudencia/page.tsx`
- `app/asistente/page.tsx`
- `app/iniciar-sesion/page.tsx`
- `app/espacio/page.tsx`
- `components/assistant-interface.tsx`
- `components/site-footer.tsx`
- `components/portal/dual-portal.tsx`
- `components/portal/dual-portal.module.css`
- `components/portal/legal-transparency-panel.tsx`
- `components/portal/future-access-page.tsx`
- `components/explore/public-explore.tsx`
- `components/explore/public-explore.module.css`
- `data/access-boundaries.ts`
- `data/analytics-events.ts`
- `types/access.ts`
- `types/domain.ts`
- `types/jurisprudence-analysis.ts`
- `lib/schemas.ts`
- `lib/schemas/jurisprudence-analysis.ts`
- `tests/dual-portal.test.tsx`
- `tests/access-boundaries.test.ts`
- `docs/analytics-event-model.md`
- `docs/phase-10-a-dual-portal.md`

## Cierre

No publicado. Sin autenticación. Sin pagos. Sin modelos externos. Sin scraping. Sin conectores. Sin analítica externa. Sin compra ni descarga pública.
