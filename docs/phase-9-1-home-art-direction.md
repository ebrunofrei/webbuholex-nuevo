# Fase 9.1 — Dirección artística e interacción principal

Fecha de cierre: 28 de julio de 2026

## Implementado

La portada se reorganizó como una experiencia editorial por escenas, manteniendo `app/page.tsx` como Server Component. La interacción quedó limitada al carrusel, el buscador y el selector contractual.

El hero contiene exactamente cuatro escenas reales:

1. Orientación jurídica.
2. Documentos jurídicos.
3. Producto `BL-LEG-CON-001` en vista previa.
4. Atención profesional.

No existe avance automático. Los cambios se realizan mediante botones anterior/siguiente, indicadores `01–04`, teclado o gesto horizontal en dispositivos táctiles. Esto evita movimiento no solicitado y respeta de forma natural las preferencias de movimiento reducido.

## Arquitectura

- `app/page.tsx`: composición de servidor y adaptación de datos.
- `components/home/home-experience.tsx`: estructura editorial posterior al hero.
- `components/home/home-hero-slider.tsx`: estado e interacción del carrusel.
- `components/home/home-scene.tsx`: presentación de una escena.
- `components/home/home-scene-navigation.tsx`: controles e indicadores.
- `components/home/home-product-showcase.tsx`: selector de versiones del producto.
- `components/home/home-template-search.tsx`: búsqueda sobre el catálogo público tipado.
- Dos CSS Modules encapsulan los estilos activos de la portada.

No se creó una raíz React paralela, `main.tsx`, `App.tsx`, HMR de Vite, service worker, FCM ni lógica de notificaciones.

## Datos y privacidad

La portada reutiliza `data/template-catalog.ts`, `lib/template-marketplace.ts`, `lib/home-view-model.ts` y sus tipos. No lee archivos físicos durante el render.

No se envían al navegador rutas privadas, hashes, tamaños internos, documentos maestros, contrato de cesión ni datos personales. No existen compra, precio, descarga o pasarela de pago.

## Estado comercial preservado

- Estado editorial: `approved`.
- Visibilidad: `editorial_preview`.
- Publicado: `false` en los metadatos privados.
- Precio: `null`.
- Moneda: `null`.
- Licencia: `pending`.
- Publicación no autorizada.

## Validación

### Comandos oficiales

Se ejecutaron en el orden solicitado:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Los cuatro comandos fueron detenidos antes de validar el código por `EPERM: operation not permitted` al intentar abrir, respectivamente:

- `node_modules/eslint/bin/eslint.js`
- `node_modules/typescript/bin/tsc`
- `node_modules/vitest/vitest.mjs`
- `node_modules/next/dist/bin/next`

`pnpm dev --port 3000` devolvió el mismo bloqueo sobre Next.js. No se cambiaron permisos, dependencias, `package.json` ni el lockfile.

### Comprobación alternativa

Una instancia local ya activa recompiló y sirvió los cambios mediante Fast Refresh. La portada, el catálogo y la ficha individual fueron cargados desde `localhost:3000` sin overlay de error.

Se verificó:

- exactamente cuatro escenas;
- un solo `h1` activo;
- botones anterior y siguiente;
- indicadores `01–04`;
- teclas ArrowLeft, ArrowRight, Home y End;
- buscador por código con un resultado real;
- selector de versiones contractual;
- cero atributos `download`;
- cero rutas o textos privados visibles;
- cero overflow horizontal a 1280 px;
- cero usos explícitos de `any` en los archivos de la fase;
- CSS Modules con llaves balanceadas;
- reglas móviles y `prefers-reduced-motion` presentes;
- metadatos comerciales inalterados;
- cero archivos del producto dentro de `public/`.

### Auditoría visual

Se revisaron las escenas 01–03, el buscador y el producto destacado en una superficie de 1280 × 720. La escena 02 inicialmente desplazaba su CTA fuera del primer pantallazo; se corrigió ampliando el área de texto y reduciendo el límite tipográfico.

Tras corregir dos advertencias heredadas de Autoprefixer, la recarga final de la consola registró únicamente el mensaje informativo de React DevTools: cero errores y cero advertencias nuevas.

La superficie de navegador disponible mantuvo un viewport fijo de 1280 × 720 y no expuso emulación o redimensionamiento. Por ello no se afirma una inspección visual móvil real ni se entrega una captura móvil simulada. El comportamiento móvil se comprobó únicamente mediante estructura y reglas CSS; debe repetirse visualmente en 390 × 844 cuando el entorno permita cambiar el viewport.

## Capturas

- `outputs/fase-9-1/01-hero-orientacion.png`
- `outputs/fase-9-1/02-hero-documentos.png`
- `outputs/fase-9-1/03-hero-producto.png`
- `outputs/fase-9-1/04-producto-destacado.png`
- `outputs/fase-9-1/05-buscador.png`
- `outputs/fase-9-1/07-consola.txt`

## Archivos de implementación

### Creados

- `components/home/home-experience.tsx`
- `components/home/home-hero-slider.tsx`
- `components/home/home-scene.tsx`
- `components/home/home-scene-navigation.tsx`
- `components/home/home-product-showcase.tsx`
- `components/home/home-template-search.tsx`
- `components/home/home-experience.module.css`
- `components/home/home-hero-slider.module.css`
- `docs/phase-9-1-home-art-direction.md`

### Modificados

- `app/page.tsx`
- `app/globals.css`
- `lib/home-view-model.ts`
- `types/home.ts`
- `tests/home-page.test.tsx`
- `tests/accessibility.test.tsx`
- `README.md`

### Retirados por reorganización

- `components/hero.tsx`
- `components/home-page-content.tsx`
- `components/home-featured-product.tsx`
- `components/home-template-search.tsx`

## Estado final

No publicado. No desplegado. Sin precio, compra, descarga, pagos, notificaciones ni servicios externos. El producto continúa en `editorial_preview` y fuera del catálogo público autorizado.
