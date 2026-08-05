# Fase 10.H — Servicio de desarrollo web, responsive y consola

Fecha: 2026-07-28
Ejecución: exclusivamente local, sin publicación ni despliegue.

## Servicio incorporado

Se añadió `SRV-WEB-001`, con slug `diseno-desarrollo-paginas-web-profesionales`, a la única colección tipada existente en `data/services.ts`. El catálogo contiene ahora ocho servicios con identificadores y slugs únicos.

El servicio se presenta como una solución digital profesional para organizaciones jurídicas, contables, tributarias, empresariales, técnicas y otros prestadores de servicios. La imagen publicitaria aportada se utilizó únicamente como referencia conceptual. No se copió al proyecto porque no se verificaron autoría, licencia ni derechos de uso.

### Estado comercial

- precio: `null`;
- moneda: `null`;
- responsable: `null`;
- pago inmediato: `false`;
- evaluación previa: `true`;
- publicación: `false`;
- disponibilidad: previa evaluación técnica y comercial.

El CTA dirige a `/consulta-profesional?service=diseno-desarrollo-paginas-web-profesionales`. El slug está restringido por el esquema a caracteres alfanuméricos y guiones. No se añadió pago, QR, carrito, descarga ni contratación automática.

## Modelo ampliado

El contrato de servicios se amplió sin duplicar colecciones mediante campos opcionales tipados:

- `publicTagline`;
- `targetAudience`;
- `needs`;
- `scopeGroups`;
- `evaluationInputs`;
- `potentialDeliverables`;
- `stages`;
- `prerequisites`;
- `published` limitado a `false`.

El esquema Zod valida estos campos y reconoce la categoría `digital`.

## Ficha dinámica

La ficha reutiliza `/servicios/[slug]` y el componente compartido. Para el servicio digital muestra:

1. Presentación.
2. Público objetivo.
3. Necesidades que puede resolver.
4. Alcance posible por módulos.
5. Información necesaria para evaluar.
6. Entregables potenciales.
7. Exclusiones.
8. Etapas de trabajo.
9. Condiciones previas.
10. Solicitud de evaluación.

Los módulos se presentan expresamente como posibilidades sujetas al alcance aprobado. No se promete posicionamiento, ventas, seguridad absoluta, disponibilidad permanente, dominio, alojamiento ni plazo sin evaluación.

## Catálogo y directorio

- `/servicios` calcula y muestra `8 servicios registrados` desde los datos.
- La cuadrícula usa dos columnas hasta 680 px y una columna por debajo de ese ancho.
- La octava tarjeta queda emparejada con el servicio de ingeniería en escritorio.
- `/explorar` describe ahora los servicios como jurídicos, empresariales, administrativos, técnicos y digitales.
- La raíz `/` conserva únicamente sus dos accesos.

## Correcciones responsive del portal

En el breakpoint de 820 px:

- el contenedor usa `min-height: 100dvh`, `height: auto` y `overflow: visible`;
- el contenido se mantiene en flujo normal y puede desplazarse naturalmente;
- el bloque privado recibe espacio inferior adicional;
- el control legal queda separado del contenido;
- el búho usa una escala fluida entre 154 y 176 px;
- la transición blanco/azul incorpora una franja intermedia suave;
- no se usa `100vw` ni altura fija del viewport para cortar contenido.

El indicador N de Next.js no fue ocultado; pertenece al modo de desarrollo.

## Saneamiento CSS

Se revisaron todos los valores `start` y `end` de alineación en los CSS de `app/` y `components/`.

- En contextos flex se utilizaron `flex-start` o `flex-end`.
- En alineación horizontal de elementos Grid LTR se utilizó `left` cuando correspondía.
- La búsqueda final no encontró valores `start` o `end` de compatibilidad mixta.
- No se deshabilitó Autoprefixer ni se ocultaron advertencias.

## Investigación de HMR

El error comunicado (`removeChild` dentro de `hotModuleReplacement.js`) se investigó como incidencia de desarrollo:

- no existe `removeChild` en el código del proyecto;
- no existe creación o eliminación manual de elementos `<link>`;
- no existe manipulación de `document.head`;
- el portal mantiene un único montaje React mediante App Router;
- una pestaña limpia recibió `Ctrl + Shift + R` y volvió a mostrar el portal sin overlay ni alerta visible.

La evidencia es compatible con una incidencia transitoria de Fast Refresh después de sustituciones repetidas de CSS Modules. El navegador integrado no expone el registro completo de DevTools, por lo que no se afirma que la consola completa esté limpia ni se crea una captura ficticia de consola.

## Auditoría de preload

- no existen `<link rel="preload">` manuales;
- se retiró `priority` de las imágenes pequeñas de `PublicHeader` y `AuthHeader` porque no son candidatos principales de LCP;
- se conservó `priority` en el búho del portal y en el visual principal del catálogo de plantillas, que sí aparecen sobre el pliegue;
- no se identificaron las URLs exactas de los avisos anteriores porque el registro de consola no está disponible en esta ejecución.

Los avisos restantes, si los hubiera, deben comprobarse en una sesión de DevTools limpia antes de atribuirlos al proyecto, a Next.js development o a extensiones.

## Auditoría visual y viewports

El titular confirmó que la Fase 10.G incluyó emulación manual mediante Chrome DevTools Device Mode en 360 × 740, 390 × 844, 400 × 900, 430 × 932 y 1024 × 1366. Esta confirmación fue añadida a la documentación de 10.G, diferenciando viewport seleccionado, zoom/escala de DevTools y dispositivo físico.

En esta ejecución de 10.H, el navegador integrado de Codex continuó fijado en 1280 × 720. Se validaron realmente:

- `/`;
- `/explorar`;
- `/servicios`;
- `/servicios/diseno-desarrollo-paginas-web-profesionales`;
- `/consulta-profesional?service=diseno-desarrollo-paginas-web-profesionales`.

Todas mostraron un solo `h1`, cero enlaces `/app`, cero atributos `download` y ninguna alerta visible de Next.js. No se generaron capturas móviles simuladas; la ficha nueva todavía requiere evidencia visual directa en Device Mode para declarar cerrada su auditoría responsive.

En páginas con barra de desplazamiento, la API de captura devolvió un raster útil de 1265 × 712 dentro del viewport anfitrión de 1280 × 720. Esta diferencia se conserva documentada y no se corrigió mediante reescalado artificial.

## Evidencia real generada

- `01-servicios-ocho-tarjetas-1280x720.png`: último par de la cuadrícula, incluida `SRV-WEB-001`, con foco visible.
- `02-servicio-web-ficha-1280x720.png`: primer pantallazo de la ficha.
- `07-explorar-servicios-digitales.png`: directorio público.
- `portal-1280x720-responsive.png`: portal tras las correcciones.
- `13-recarga-limpia-sin-overlay.png`: portal después de recarga limpia; no es una captura de consola.

No se generaron los archivos móviles ni las capturas de consola solicitadas porque esas superficies no estuvieron disponibles. Los nombres no se reutilizaron para evidencia distinta.

## Pruebas

Se creó `tests/phase-10-h-web-services-console.test.tsx` y se actualizó `tests/services-catalog.test.tsx` para cubrir:

- existencia y estado de `SRV-WEB-001`;
- ocho servicios y unicidad;
- slug y CTA;
- ausencia de pago inmediato, precio, moneda y responsable;
- ficha con un solo `h1`;
- ausencia de compra, descarga, rutas privadas, QR y datos bancarios;
- ausencia de promesas en el contenido afirmativo;
- descripción digital de `/explorar`;
- canales institucionales centralizados;
- ausencia de `start/end` incompatibles y `100vw` crítico.

La suite no pudo ejecutarse por EPERM.

## Validación oficial

| Comando | Estado | Ruta bloqueada |
| --- | --- | --- |
| `pnpm lint` | EPERM antes de lint | `node_modules/eslint/bin/eslint.js` |
| `pnpm typecheck` | EPERM antes de typecheck | `node_modules/typescript/bin/tsc` |
| `pnpm test` | EPERM antes de pruebas | `node_modules/vitest/vitest.mjs` |
| `pnpm build` | EPERM antes del build | `node_modules/next/dist/bin/next` |
| `pnpm dev --port 3000` | EPERM antes del arranque | `node_modules/next/dist/bin/next` |

No se alteraron permisos, dependencias, `package.json` ni lockfile. La instancia local preexistente compiló y sirvió los datos y componentes modificados, permitiendo las comprobaciones DOM y visuales descritas.

## Archivos modificados

- `app/globals.css`
- `components/auth-header.tsx`
- `components/explore/public-explore.module.css`
- `components/explore/public-explore.tsx`
- `components/home/home-experience.module.css`
- `components/portal/dual-portal.module.css`
- `components/public-header.tsx`
- `components/services/service-catalog.tsx`
- `components/services/service-detail.tsx`
- `components/services/services.module.css`
- `data/services.ts`
- `lib/schemas/services.ts`
- `tests/services-catalog.test.tsx`
- `types/services.ts`
- `docs/phase-10-g-responsive-audit.md`
- `outputs/fase-10-g/INFORME-FINAL.md`

## Archivos creados

- `tests/phase-10-h-web-services-console.test.tsx`
- `docs/phase-10-h-web-services.md`
- `outputs/fase-10-h/INFORME-FINAL.md`
- cinco capturas reales bajo `outputs/fase-10-h/capturas/`.

## Estado final

El servicio y las correcciones quedaron implementados localmente. La validación DOM y visual de escritorio quedó realizada. La fase no se declara completamente cerrada porque faltan capturas reales de la ficha nueva en los viewports móviles requeridos y no fue posible observar el registro completo de consola.

No publicado. No desplegado. Sin autenticación real, pagos, compra, descarga, scraping ni analítica externa. BL-LEG-CON-001 permanece sin cambios.
