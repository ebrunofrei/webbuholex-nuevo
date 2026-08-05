# Fase 9 — Portada dinámica de BúhoLex

Fecha: 27 de julio de 2026

## Implementado

- Portada reconstruida como entrada a orientación, plantillas, jurisprudencia, servicios y contacto.
- Hero con la identidad institucional, el búho existente y tres acciones reales.
- Rutas de entrada por necesidad.
- Producto destacado `BL-LEG-CON-001` alimentado por el modelo público tipado de la Fase 8.
- Buscador local por nombre, código y materia, con sugerencias y estado vacío.
- Categorías legales, empresariales y contables con conteos calculados.
- Explicación del Asistente Legal, etapas de atención profesional, jurisprudencia y controles editoriales.
- Diseño adaptable a escritorio, tableta y móvil, con foco visible y respeto de `prefers-reduced-motion`.

## Separación y seguridad

La portada recibe un modelo reducido y seguro. No contiene rutas privadas, hashes, tamaños, inventarios, archivos internos ni el contrato de cesión. `BL-LEG-CON-001` aparece en la portada únicamente en desarrollo mientras conserva `published = false` y `visibility = editorial_preview`.

No se incorporaron precio, moneda, compra, descarga, pagos, correo ni conexiones externas.

## Referencia visual

Se revisó la portada pública existente de BúhoLex para conservar reconocimiento de marca: cabecera terracota, campo claro, protagonismo del búho y carácter editorial. No se trasladaron funciones heredadas que no pertenecen al alcance actual, como inicio de sesión, LitisBot, noticias o una oficina virtual.

## Rutas verificadas

- `/`
- `/asistente/`
- `/plantillas/`
- `/plantillas/legales/`
- `/plantillas/legales/contrato-arrendamiento-vivienda/`
- `/consulta-profesional/`
- `/servicios/`
- `/jurisprudencia/`

## Estado comercial preservado

- Producto no publicado.
- Visibilidad `editorial_preview`.
- Precio y moneda pendientes.
- Licencia pendiente.
- Autorización de publicación pendiente.
- Compra y descargas inexistentes.

## Validación

### Herramienta oficial

Se ejecutaron, en el orden solicitado:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Los cuatro comandos se detuvieron antes de validar el código por `EPERM: operation not permitted`. Las rutas bloqueadas fueron, respectivamente:

- `node_modules/eslint/bin/eslint.js`
- `node_modules/typescript/bin/tsc`
- `node_modules/vitest/vitest.mjs`
- `node_modules/next/dist/bin/next`

También se ejecutó `pnpm dev --port 3000`; Next.js no pudo abrir `node_modules/next/dist/bin/next` por el mismo bloqueo. No se modificaron dependencias, permisos, `package.json` ni el lockfile.

### Comprobación alternativa

- Cero usos explícitos de `any` en los archivos creados o modificados para la portada.
- Balance correcto de llaves del archivo CSS: 767 aperturas y 767 cierres.
- Rutas de acciones y categorías cotejadas contra páginas existentes.
- Vista previa condicionada a `NODE_ENV === "development"`.
- Modelo de inicio protegido frente a rutas privadas, hashes, referencia de cesión y campos internos.
- No existen atributos de descarga ni rutas de compra en los componentes de inicio.
- No hay archivos del producto incorporados dentro de `public/`.
- Favicon servido mediante `app/icon.svg`.

La copia temporal del compilador para una comprobación sintáctica adicional también fue rechazada por los mismos permisos de lectura sobre `node_modules`; no se reconstruyeron dependencias.

## Auditoría visual

Se revisaron visualmente la captura proporcionada y el sitio público existente. La propuesta conserva sus señales de reconocimiento —terracota, fondo claro, búho protagonista y tipografía editorial— sin copiar la interfaz heredada.

La auditoría de la implementación local y las capturas de escritorio/móvil no pudieron realizarse: `pnpm dev --port 3000` no inició por `EPERM` y el navegador devolvió `ERR_CONNECTION_REFUSED` en `http://localhost:3000`. En consecuencia, no se afirma una inspección visual local ni se entregan capturas falsas. Cuando el bloqueo sea retirado, deben revisarse `http://localhost:3000` en 1440 × 900 y 390 × 844, además de la consola.

## Archivos

### Creados

- `types/home.ts`
- `lib/home-view-model.ts`
- `components/home-page-content.tsx`
- `components/home-featured-product.tsx`
- `components/home-template-search.tsx`
- `tests/home-page.test.tsx`
- `docs/phase-9-dynamic-home.md`

### Modificados

- `app/page.tsx`
- `app/globals.css`
- `components/hero.tsx`
- `tests/accessibility.test.tsx`
- `README.md`

## Cierre

No publicado. No desplegado. Sin compra. Sin descargas. Sin pagos. Sin productos ficticios. `BL-LEG-CON-001` conserva el estado editorial aprobado, la disponibilidad `editorial_preview`, el precio y la moneda nulos y la licencia pendiente.
