# Fase 10.F — Correcciones de footer y panel institucional

Fecha de cierre local: 2026-07-28.

## Diagnóstico asumido

El footer de la Fase 10.E era correcto en contenido, pero visualmente débil: superficie completamente blanca, tipografía pequeña, línea roja dominante, exceso de aire y un estado del Libro de Reclamaciones aislado. El panel legal mezclaba enlaces y texto auxiliar con escasa jerarquía. En contacto, `overflow-wrap: anywhere` permitía cortes arbitrarios del correo.

## Footer corregido

El footer conserva un único elemento `footer` y se organiza en dos niveles:

1. Nivel principal beige `#f7f4ef`, con marca, descripción, navegación, atención, legal, contacto y una franja compacta para atención al consumidor.
2. Nivel inferior marrón `#382116`, con copyright, advertencia sobre asesoría individual e identificación mínima.

La línea roja se eliminó y se sustituyó por un borde marrón translúcido de un píxel. Los títulos usan `.82rem`; enlaces y texto usan `.88rem`; el copyright usa `.78rem`.

El `body` funciona como contenedor vertical y `#contenido` ocupa el espacio disponible. De este modo, las páginas breves mantienen el footer al final del viewport sin contenido ficticio ni alturas exageradas.

## Panel institucional

Se mantuvo sin cambios su contrato accesible: diálogo modal, cierre con botón y Escape, bloqueo del scroll, ciclo de foco y retorno al disparador.

Cambios visuales:

- fondo blanco puro;
- títulos `#102a2e`;
- texto `#374151`;
- enlaces `#9f2f1e`, con hover `#d9482b`;
- separadores `#e5e7eb`;
- información empresarial convertida a `dl`, `dt` y `dd`;
- correo, WhatsApp y canales con etiquetas explícitas.

Contraste calculado:

- texto del panel sobre blanco: 10.31:1;
- enlaces del panel sobre blanco: 7.24:1;
- texto auxiliar del footer sobre beige: 6.89:1;
- texto claro sobre la franja marrón: 14.49:1.

Todos superan WCAG AA para texto normal.

## Correo corporativo

`eduardo@buholex.com` usa `.contact-email` con `white-space: nowrap` en escritorio. La columna de correo recibe mayor proporción de ancho. Por debajo de 560 px se habilita `overflow-wrap: break-word`, sin `break-all` ni `anywhere`.

La captura real a 1280 × 720 confirma que el correo se muestra completo.

## Ajustes focalizados adicionales

- `/explorar`: transición suave al footer, mayor cierre vertical y estados ligeramente más legibles.
- `/biblioteca` y `/codigos`: tarjetas con borde neutro, sombra ligera y acento rojo; footer anclado mediante el shell global.
- `/servicios`: última tarjeta impar centrada deliberadamente, CTA alineados y mayor separación del bloque WhatsApp.
- `/jurisprudencia`: pestañas blancas dentro de un contenedor definido y panel tecnológico azul con borde/sombra.

## Indicador de desarrollo de Next.js

El círculo negro con la letra “N” y su menú pertenecen al modo `development` de Next.js. No forman parte de BúhoLex y no se ocultaron mediante CSS. No se modificó configuración porque el comando local de Next permanece bloqueado por EPERM y no se justificó alterar una opción sin validación oficial.

## Auditoría visual

Se revisaron en localhost a 1280 × 720:

- `/`
- `/explorar`
- `/jurisprudencia`
- `/codigos`
- `/biblioteca`
- `/plantillas`
- `/servicios`
- `/asistente`
- `/contacto`

Resultados: un footer en cada ruta pública y ninguno en el portal raíz; un solo `h1`; cero datos bancarios, descargas o rutas privadas. El panel cerró con Escape y devolvió el foco.

## Validación oficial

Los comandos se ejecutaron en el orden solicitado, pero no cargaron el proyecto:

| Comando | Bloqueo |
| --- | --- |
| `pnpm lint` | EPERM en `node_modules/eslint/bin/eslint.js` |
| `pnpm typecheck` | EPERM en `node_modules/typescript/bin/tsc` |
| `pnpm test` | EPERM en `node_modules/vitest/vitest.mjs` |
| `pnpm build` | EPERM en `node_modules/next/dist/bin/next` |
| `pnpm dev --port 3000` | EPERM en `node_modules/next/dist/bin/next` |

No se tocaron permisos, dependencias, `package.json` ni lockfile.

Comprobaciones alternativas:

- 10 CSS revisados, sin llaves desbalanceadas;
- cero `any` explícitos nuevos;
- cero `word-break: break-all`;
- cero datos bancarios;
- cero atributos `download`;
- cero archivos del producto dentro de `public/`;
- seis capturas reales guardadas;
- estado comercial preservado.

## Estado final

No publicado, no desplegado, sin autenticación real, pagos, compra, descargas, scraping, analítica externa, servicios externos ni datos bancarios.
