# Fase 10.G — Auditoría responsive y saneamiento CSS

Fecha de ejecución: 2026-07-28
Proyecto: `buholex-v2`
Ámbito: implementación y comprobación local; sin publicación ni despliegue.

## Diagnóstico inicial

El rectángulo percibido alrededor del búho en móvil no procedía de un fondo opaco del PNG. La imagen estaba integrada en una composición cuyo halo, recorte y posición no estaban separados con suficiente claridad y cuyo estado móvil dependía de márgenes negativos.

La cabecera pública ya disponía de botón móvil y cierre con Escape, pero no bloqueaba el desplazamiento del fondo mientras el menú estaba abierto. El panel legal necesitaba margen móvil, límite de altura y contención de desplazamiento. El footer conservaba dos columnas en anchos muy estrechos. También existían valores CSS `end` que Autoprefixer identifica como de compatibilidad mixta.

## Auditoría del activo institucional

Archivo auditado: `public/brand/buho-institucional.png`.

- dimensiones reales: 783 × 1057 px;
- formato: PNG, `Format32bppArgb`;
- tipo de color PNG: 6, truecolor con canal alfa;
- píxeles totalmente transparentes: 291 385;
- píxeles no transparentes: 536 246;
- límites del contenido con alfa: x=16…775, y=36…1024;
- esquinas comprobadas: transparentes.

El original ya contiene transparencia verdadera. Por ello no se creó `buho-institucional-transparente.png`: duplicarlo no aportaría una corrección técnica y contradiría el criterio de mantener una única fuente visual cuando el activo es válido.

## Solución aplicada

La imagen y el halo se separaron en dos elementos:

- `owlHalo`: círculo de composición, gradiente radial, borde y sombra ambiental, con `overflow: visible`;
- `owlImage`: PNG transparente, `object-fit: contain`, sin fondo ni sombra rectangular;
- desplazamiento interactivo máximo de 5 px;
- flotación máxima de 6 px;
- entrada limitada a 720 ms;
- animación y transformaciones desactivadas con `prefers-reduced-motion: reduce`.

En anchos de hasta 820 px, el portal adopta el orden público → búho → espacio inteligente. Se eliminaron márgenes negativos y la composición principal no depende de posición absoluta. El control legal pasa al flujo normal y mantiene una altura táctil mínima de 44 px. A 430 px o menos, el footer se apila en una sola columna y sus enlaces disponen de área táctil suficiente.

La cabecera pública ahora:

- mantiene `aria-expanded` y `aria-controls`;
- cierra mediante Escape;
- bloquea el scroll del documento mientras el menú está abierto;
- limita la altura del menú al viewport y permite scroll interno;
- no contiene rutas `/app`.

El panel legal conserva el diálogo accesible, ciclo y retorno de foco, bloqueo de fondo y estructura `dl`/`dt`/`dd`. En móvil incorpora margen lateral, scroll interno contenido, título fluido y botón de cierre visible.

## Breakpoints aplicados

- `max-width: 1180px`: activación del menú público colapsado;
- `max-width: 820px`: apilamiento vertical del portal dual;
- `max-width: 560px`: normalización general de páginas y contacto;
- `max-width: 430px`: portal estrecho y footer en una sola columna.

## Advertencias CSS corregidas

Se reemplazaron valores de compatibilidad mixta por sus equivalentes flexibles:

- `components/services/services.module.css`;
- `components/jurisprudence/jurisprudence.module.css`;
- `components/portal/dual-portal.module.css`;
- `app/globals.css`.

La comprobación estática no encontró `align-items: end`, `justify-content: end`, `place-content: end`, `align-content: end`, `justify-self: end` ni `align-self: end` en los estilos críticos. Tampoco encontró `width: 100vw`, `word-break: break-all` ni archivos del producto dentro de `public/`.

## Pruebas añadidas

`tests/phase-10-g-responsive.test.tsx` cubre:

- dimensiones y canal alfa del PNG institucional;
- separación halo/imagen;
- orden móvil del portal;
- `overflow: visible` del halo;
- movimiento reducido;
- ausencia de `100vw` crítico;
- eliminación de valores `end` incompatibles;
- menú público accesible, cierre con Escape y bloqueo de scroll;
- panel legal y estructura empresarial;
- footer único;
- contacto corporativo centralizado;
- preservación del estado comercial de BL-LEG-CON-001.

La suite fue creada, pero no pudo ejecutarse por el bloqueo EPERM descrito más adelante.

## Validación visual real

### Aclaración de trazabilidad incorporada en la Fase 10.H

El titular confirmó posteriormente que durante la revisión de la Fase 10.G también se realizaron comprobaciones manuales mediante Chrome DevTools Device Mode en 360 × 740, 390 × 844, 400 × 900, 430 × 932 y 1024 × 1366. Estas comprobaciones corresponden a viewports seleccionados en emulación manual: no equivalen a resolución física, prueba en dispositivo real ni automatización del navegador integrado de Codex. La limitación descrita a continuación se refería exclusivamente a la automatización disponible durante aquella ejecución y no invalida la evidencia manual confirmada por el titular.

El navegador integrado mantuvo forzosamente un viewport de 1280 × 720. Los intentos de redimensionado devolvieron:

- `TypeError: tab10g.playwright.setViewportSize is not a function`;
- `TypeError: tab10g.resize is not a function`;
- la creación de una pestaña con `{ viewport: { width: 390, height: 844 } }` produjo una captura real de 1280 × 720, por lo que la opción fue ignorada.

No se simularon capturas ni se renombraron capturas de escritorio como móviles.

### Viewports solicitados

| Viewport | Estado real |
| --- | --- |
| 360 × 800 | No validado visualmente: el navegador integrado no permite redimensionar |
| 390 × 844 | No validado visualmente: la solicitud produjo 1280 × 720 |
| 430 × 932 | No validado visualmente: el navegador integrado no permite redimensionar |
| 768 × 1024 | No validado visualmente: el navegador integrado no permite redimensionar |
| 1024 × 600 | No validado visualmente: el navegador integrado no permite redimensionar |
| 1280 × 720 | Validado realmente |
| 1440 × 900 | No validado visualmente: el navegador integrado no permite redimensionar |

### Rutas validadas realmente a 1280 × 720

`/`, `/explorar`, `/jurisprudencia`, `/servicios`, `/plantillas`, `/asistente`, `/contacto`, `/biblioteca`, `/codigos`, `/iniciar-sesion` y `/espacio`.

Resultados comunes:

- exactamente un `h1` por ruta;
- ningún enlace público hacia `/app`;
- ningún atributo `download`;
- un único footer en las rutas públicas que lo utilizan;
- contactos institucionales completos;
- sin error visible en la región de alertas de Next.js.

El indicador circular de Next.js visible en las capturas pertenece al modo `development`; no se ocultó con CSS.

## Capturas reales disponibles

Se generaron capturas PNG reales del portal, panel legal, foco visible y las once rutas auditadas. El viewport del navegador permaneció fijado en 1280 × 720; en páginas con barras propias, la API devolvió un raster de contenido de 1265 × 712. De la lista obligatoria solicitada, solo `06-portal-1280x720.png` corresponde a un viewport realmente disponible. Las capturas móviles no se generaron porque el entorno no ofreció ese viewport.

## Validación técnica oficial

Los comandos se ejecutaron en el orden solicitado y todos quedaron bloqueados antes de validar el código:

| Comando | Resultado | Ruta bloqueada |
| --- | --- | --- |
| `pnpm lint` | EPERM | `node_modules/eslint/bin/eslint.js` |
| `pnpm typecheck` | EPERM | `node_modules/typescript/bin/tsc` |
| `pnpm test` | EPERM | `node_modules/vitest/vitest.mjs` |
| `pnpm build` | EPERM | `node_modules/next/dist/bin/next` |
| `pnpm dev --port 3000` | EPERM | `node_modules/next/dist/bin/next` |

También se intentó usar `node_modules/typescript/lib/typescript.js` para una comprobación sintáctica alternativa, pero el mismo control del entorno devolvió EPERM. No se cambiaron permisos, dependencias, `package.json` ni el lockfile. La instancia local ya disponible permitió la inspección visual real.

## Comprobaciones alternativas

- CSS crítico balanceado e inspeccionado;
- las once rutas mostraron vacía la región visible de alertas de Next.js;
- cero valores `end` incompatibles en los selectores auditados;
- cero `100vw` en componentes críticos;
- cero `word-break: break-all`;
- canal alfa, dimensiones y límites del PNG calculados desde el archivo real;
- once rutas abiertas y comprobadas en la aplicación local;
- un `h1` por ruta mediante DOM real;
- cero enlaces `/app` y cero descargas mediante DOM real;
- panel legal abierto y semántica comprobada;
- cero archivos BL-LEG-CON-001 dentro de `public/`;
- contacto centralizado: `eduardo@buholex.com`, `922 038 147`, `51922038147`;
- no se añadieron `any` explícitos;
- no se introdujeron datos bancarios.

## Archivos modificados

- `app/globals.css`
- `components/jurisprudence/jurisprudence.module.css`
- `components/portal/dual-portal.module.css`
- `components/portal/dual-portal.tsx`
- `components/public-header.tsx`
- `components/services/services.module.css`

## Archivos creados

- `tests/phase-10-g-responsive.test.tsx`
- `docs/phase-10-g-responsive-audit.md`
- `outputs/fase-10-g/INFORME-FINAL.md`
- capturas PNG reales bajo `outputs/fase-10-g/capturas/`

## Estado final

La implementación responsive y el saneamiento CSS quedaron aplicados localmente. La comprobación de escritorio a 1280 × 720 quedó documentada. El cierre visual integral de 360, 390, 430, 768, 1024 y 1440 px permanece **no validado por limitación del navegador disponible**, por lo que no se declara una auditoría móvil inexistente.

No publicado. No desplegado. Sin autenticación real, pagos, compra, descarga, scraping ni analítica externa. BL-LEG-CON-001 conserva `published: false`, `visibility: editorial_preview`, `price: null`, `currency: null`, licencia `pending` y autorización de publicación ausente.
