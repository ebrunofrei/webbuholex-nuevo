# BúhoLex v2 — Fase 8: catálogo interactivo y ficha dinámica

Fecha: 27 de julio de 2026
Producto: `BL-LEG-CON-001 — Contrato de Arrendamiento de Vivienda`

## Resultado implementado

La experiencia de plantillas se dividió en dos superficies independientes:

1. Catálogo y ficha de producto con datos públicos seguros, búsqueda, filtros e interacción.
2. Panel editorial local con inventario, integridad, metadatos físicos y bloqueos.

El producto aparece en el catálogo solo cuando la aplicación se ejecuta en desarrollo y conserva `editorial_preview`. La ficha individual y el panel editorial devuelven 404 fuera de desarrollo. No se modificó el filtro de publicación real.

## Rutas

- Catálogo: `/plantillas/`.
- Categoría legal: `/plantillas/legales/`.
- Ficha individual: `/plantillas/legales/contrato-arrendamiento-vivienda/`.
- Panel editorial: `/editorial/plantillas/BL-LEG-CON-001/`.

La ficha individual no se añadió al sitemap porque el producto no está publicado. El panel editorial tampoco forma parte del sitemap.

## Datos reutilizados y frontera de privacidad

El adaptador `buildTemplateMarketplaceProduct` combina los datos tipados de `data/template-catalog.ts` y los conteos de `data/product-packages.ts`. Produce un modelo público que no contiene:

- rutas o referencias de archivos;
- hashes o tamaños;
- nombres de documentos internos;
- plantilla maestra;
- respaldo de cesión;
- RUC, representante legal, firmas, DNI o domicilios;
- controles técnicos de integridad.

Los componentes interactivos reciben únicamente ese modelo seguro. No leen Word, PDF, `metadata.json` ni `product-assets` durante el render.

## Catálogo

Se implementaron:

- hero de catálogo alineado con la marca BúhoLex;
- navegación por Legales, Empresariales y Contables;
- búsqueda por nombre, código y materia;
- filtros por categoría, materia, jurisdicción, tipo y disponibilidad;
- contador dinámico;
- tarjeta del único producto real;
- estado vacío con restablecimiento de filtros;
- diseño responsive y estados hover/focus.

No se crearon productos ficticios.

## Ficha dinámica

La ficha presenta datos editoriales públicos, alcance, público objetivo, supuestos, exclusiones, advertencias, requisitos formales, 3 contratos, 8 anexos y 4 grupos auxiliares.

El selector contractual actualiza sin recargar la página:

- descripción;
- formalidades;
- supuestos de uso;
- advertencias;
- documentos vinculados;
- anexos recomendados.

Las alternativas son Ordinaria, Allanamiento futuro y Ley N.° 30933. El contenido incluido, las formalidades, los riesgos y las preguntas frecuentes utilizan acordeones nativos accesibles.

En escritorio existe índice y resumen lateral sticky. En móvil el índice pasa a un desplegable, el resumen deja de ser sticky, los grids se reducen a una columna y la acción ocupa el ancho disponible.

El único control comercial es un botón nativo deshabilitado, sin URL:

`Próximamente disponible`

Se acompaña del mensaje: “Producto en revisión comercial. Precio, licencia y canal de entrega pendientes de aprobación.”

## Panel editorial

La ruta editorial conserva:

- 22 documentos recibidos y verificados;
- 0 aprobados;
- distribución 16 / 5 / 1;
- estado `ready_for_review`;
- responsable editorial y revisor jurídico;
- autoría y cesión formalizadas;
- titularidad patrimonial;
- inventario, tamaños, hashes y referencias privadas controladas;
- 7 bloqueos pendientes.

Nada de este inventario técnico se renderiza en las páginas del catálogo.

## Correcciones visuales y de navegación

- Se eliminó `scroll-behavior: smooth` de `html` y se mantuvo `scroll-padding-top`.
- Se creó `app/icon.svg` y `/favicon.ico` redirige a `/icon.svg` para evitar el 404.
- El encabezado marca la sección activa con `aria-current="page"`.
- El menú móvil conserva alternancia, Escape y cierre al navegar.
- La navegación de categorías envuelve sus elementos en móvil, sin barra horizontal interna.
- Los contenedores públicos utilizan columnas `minmax(0, 1fr)`, adaptación a una columna y contenido con `min-width: 0`.
- `prefers-reduced-motion` continúa anulando transiciones y animaciones.

## Pruebas añadidas o actualizadas

- catálogo limitado al único producto real;
- vista previa local frente a exclusión pública;
- búsqueda por nombre, código y materia;
- filtros y restablecimiento;
- selector contractual;
- acordeones;
- botón comercial deshabilitado;
- ausencia de compra, descarga, rutas, hashes, internos y cesión;
- separación entre catálogo y panel editorial;
- estilos móviles básicos;
- navegación activa y menú móvil;
- nuevas rutas y redirección de favicon;
- accesibilidad automatizada del catálogo y ficha.

## Validación oficial

Los comandos se ejecutaron en el orden solicitado, pero el entorno volvió a bloquear los ejecutables antes de analizar el código:

| Comando | Resultado | Ruta afectada |
|---|---|---|
| `pnpm lint` | `EPERM`, ESLint no inició | `node_modules/eslint/bin/eslint.js` |
| `pnpm typecheck` | `EPERM`, TypeScript no inició | `node_modules/typescript/bin/tsc` |
| `pnpm test` | `EPERM`, Vitest no inició | `node_modules/vitest/vitest.mjs` |
| `pnpm build` | `EPERM`, Next.js no inició | `node_modules/next/dist/bin/next` |

No se modificaron permisos, dependencias, `package.json`, lockfile o `node_modules`.

## Comprobaciones alternativas

- Sintaxis de los archivos TypeScript sin JSX mediante el lector experimental de Node: correcta.
- Llaves CSS: 609 de apertura y 609 de cierre.
- `scroll-behavior: smooth`: ausente.
- `any` explícito en TypeScript/TSX: 0 coincidencias.
- Productos reales registrados: 1.
- Versiones contractuales: 3.
- Contratos comerciales: 3.
- Anexos: 8.
- Coincidencias sensibles en fuentes de componentes públicos: 0.
- Archivos del producto en `public/`: 0.
- `published`: `false` en metadata.
- Visibilidad: `editorial_preview`.
- Precio y moneda: `null`.
- Licencia: `pending`.
- Autorización de publicación: `false`.

Estas comprobaciones no sustituyen lint, typecheck, Vitest, build o inspección real en navegador.

## Auditoría visual y capturas

El intento `pnpm dev --port 3000` terminó antes de iniciar el servidor:

```text
EPERM: operation not permitted, open 'C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\next\dist\bin\next'
```

Una consulta posterior a `http://localhost:3000/plantillas` agotó el tiempo de espera, confirmando que no había otro servidor disponible.

Por ello:

- resultado visual de escritorio: no validado;
- resultado visual móvil: no validado;
- consola del navegador: no validada;
- overflow real: no validado en navegador;
- enlaces activos reales: no validados en navegador;
- capturas generadas: 0;
- servidor dejado en ejecución: no, porque Next.js no pudo iniciar.

No se fabricaron capturas ni se afirmó una inspección inexistente.

## Archivos creados

- `app/icon.svg`
- `app/plantillas/legales/contrato-arrendamiento-vivienda/page.tsx`
- `app/editorial/plantillas/BL-LEG-CON-001/page.tsx`
- `components/catalog-hero.tsx`
- `components/template-catalog-explorer.tsx`
- `components/template-product-experience.tsx`
- `types/template-marketplace.ts`
- `lib/template-marketplace.ts`
- `tests/template-marketplace.test.tsx`
- `tests/site-header.test.tsx`
- `docs/phase-8-interactive-catalog.md`

## Archivos modificados

- `README.md`
- `next.config.ts`
- `app/layout.tsx`
- `app/globals.css`
- `app/plantillas/page.tsx`
- `app/plantillas/legales/page.tsx`
- `app/plantillas/empresariales/page.tsx`
- `app/plantillas/contables/page.tsx`
- `components/site-header.tsx`
- `components/template-catalog.tsx`
- `components/template-product-card.tsx`
- `types/catalog.ts`
- `lib/schemas/catalog.ts`
- `data/template-catalog.ts`
- `tests/accessibility.test.tsx`
- `tests/catalog-state.test.tsx`
- `tests/routes.test.ts`

## Estado final

- Producto: **NO PUBLICADO**.
- `published`: `false`.
- Visibilidad: `editorial_preview`.
- Precio y moneda: pendientes.
- Licencia: pendiente.
- Compra y descarga: inexistentes.
- Producto ficticio: ninguno.
- Panel editorial: separado y limitado a desarrollo.
- Servicios externos y despliegue: no conectados.
