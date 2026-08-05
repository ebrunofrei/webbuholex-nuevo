# BúhoLex v2 — Fase 7: formalización editorial y auditoría visual local

Fecha: 27 de julio de 2026
Producto: `BL-LEG-CON-001 — Contrato de Arrendamiento de Vivienda`

## Resultado

Se formalizaron en el dominio editorial la autoría institucional, coautoría, elaboración jurídica, responsable editorial, revisión jurídica, titularidad patrimonial y marca. El respaldo corporativo existe, está firmado y fue verificado técnicamente, pero permanece fuera del paquete comercial, de `deliveryFiles` y de cualquier raíz pública.

El producto conserva `published: false`, visibilidad `editorial_preview`, precio y moneda nulos, licencia pendiente y ausencia total de compra, descarga y URL pública. Los 22 documentos del producto permanecen recibidos y verificados, ninguno aprobado. El estado calculado del paquete continúa en `ready_for_review`.

## Campos actualizados

- Autor institucional: BúhoLex LegalTech.
- Coautor y responsable de elaboración jurídica: Eduardo Frei Bruno Gómez.
- Responsable editorial: Eduardo Frei Bruno Gómez.
- Revisor jurídico de la versión 0.10: Eduardo Frei Bruno Gómez.
- Titular de derechos patrimoniales: Empresa Constructora, Consultora, Bienes y Servicios en General Julita S.A.C.
- RUC del titular: registrado en los datos privados del dominio; no se muestra en la vista.
- Marca: BúhoLex LegalTech.
- Representante legal: registrada en los datos privados del dominio; no se muestra en la vista.
- Estado de autoría: `formalized`.
- Estado de cesión patrimonial: `documented`.

No se registró fecha de suscripción: la línea de fecha del documento firmado está sin completar.

## Respaldo corporativo privado

Referencia privada relativa:

`legal/intellectual-property/BL-LEG-CON-001/CONTRATO-CESION-DERECHOS-BL-LEG-CON-001.pdf`

- Existe y abre como PDF de 5 páginas.
- Tamaño calculado: 131 237 bytes.
- SHA-256 calculado: `ddd9cc585e6a6a588ca9572cd7b5307b820696ea003e7489e1a4e869d3d4d1b9`.
- Estado técnico interno: `verified`.
- Firmado: sí.
- Fecha de firma: `null`.
- Entregable: no.
- Visible públicamente: no.
- Descargable: no.
- Incluido en los 22 documentos: no.
- Incluido en los 16 `deliveryFiles`: no.

La interfaz editorial solo presenta “Respaldo corporativo privado verificado”. No muestra nombre de archivo, referencia, hash, tamaño, RUC, representante, DNI, domicilio, firmas ni contenido contractual.

## Bloqueos recalculados

De los 9 bloqueos activos al cierre de la Fase 6 se resolvieron 2:

- `editorial_owner_identified`;
- `legal_reviewer_identified`.

La autoría y la titularidad no eran bloqueos independientes en el modelo anterior; quedaron formalizadas mediante campos tipados y evidencia privada sin alterar artificialmente el historial de requisitos.

Permanecen 7 bloqueos:

- `price_approved`;
- `currency_approved`;
- `license_approved`;
- `publication_authorized`;
- `required_auxiliary_documents` — los archivos existen y están verificados, pero todavía no están aprobados;
- `delivery_channel_approved`;
- `commercial_refund_rules`.

## Vista editorial

- Ruta de aplicación: `/plantillas/legales/`.
- URL local prevista: `http://localhost:3000/plantillas/legales/`.
- Comando previsto: `pnpm dev --port 3000`.
- Condición de visibilidad: solo `NODE_ENV === "development"`.

La vista fue actualizada para mostrar código, título, estado editorial, estado comercial, visibilidad, versión jurídica, versión del paquete, autor institucional, coautor, responsable editorial, revisor jurídico, titular patrimonial, marca, conteos documentales, verificación y los 7 bloqueos restantes. No se agregaron botones ni enlaces.

## Auditoría visual local

No pudo ejecutarse una inspección visual real. El comando de desarrollo se detuvo antes de iniciar el servidor:

```text
pnpm dev --port 3000
EPERM: operation not permitted, open 'C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\next\dist\bin\next'
```

Consecuencias:

- servidor en ejecución: no;
- captura completa de escritorio: no generada;
- captura de documentos: no generada;
- captura de bloqueos: no generada;
- captura móvil a 390 px: no generada;
- captura de error visual: no aplica; no hubo renderizado;
- errores de consola del navegador: no evaluados;
- enlaces rotos: no evaluados en navegador;
- desbordamiento, truncado y comportamiento responsive: no validados visualmente.

No fue posible dejar la aplicación ejecutándose porque Next.js no alcanzó a iniciar. La revisión estática confirmó que la tabla documental usa un contenedor con desplazamiento horizontal interno, la formalización cambia a una columna bajo 560 px, no existen enlaces o botones en los componentes editoriales y ninguna referencia privada se renderiza. Estas observaciones no sustituyen la auditoría visual requerida.

## Validación oficial

Los comandos se ejecutaron en el orden solicitado. Todos terminaron antes de analizar el proyecto por `EPERM`:

| Comando | Resultado | Ruta bloqueada |
|---|---|---|
| `pnpm lint` | No ejecutó ESLint | `node_modules/eslint/bin/eslint.js` |
| `pnpm typecheck` | No ejecutó TypeScript | `node_modules/typescript/bin/tsc` |
| `pnpm test` | No ejecutó Vitest | `node_modules/vitest/vitest.mjs` |
| `pnpm build` | No ejecutó Next.js | `node_modules/next/dist/bin/next` |

No se cambiaron permisos, dependencias, `package.json`, lockfile ni `node_modules`.

## Comprobaciones alternativas

- Sintaxis de los archivos TypeScript modificados sin JSX mediante `node --experimental-strip-types --check`: correcta.
- `metadata.json`: JSON válido.
- Respaldo corporativo: existencia, firma visual, cabecera PDF, tamaño y SHA-256 comprobados desde el archivo real.
- RUC: 11 dígitos en el esquema; no visible en componentes.
- Referencia del respaldo: relativa, privada y no HTTP.
- Respaldo fuera de los 22 registros y de `deliveryFiles`.
- Archivos del producto o de la cesión dentro de `public/`: 0.
- Coincidencias de `any` explícito en archivos afectados: 0.
- Precio: `null`.
- Moneda: `null`.
- Licencia: `pending`.
- `published`: `false`.
- Visibilidad: `editorial_preview`.
- Conteo documental preservado: 22 (16 cliente, 5 internos, 1 informativo futuro).
- Estado esperado por la lógica vigente: `ready_for_review`, con 7 bloqueos activos.

Estas comprobaciones no sustituyen lint, typecheck, pruebas, build ni auditoría visual en navegador.

## Archivos creados

- `docs/phase-7-editorial-formalization.md`

## Archivos modificados

- `README.md`
- `types/catalog.ts`
- `lib/schemas/catalog.ts`
- `data/template-catalog.ts`
- `product-assets/BL-LEG-CON-001/metadata.json`
- `components/template-editorial-preview.tsx`
- `app/globals.css`
- `tests/catalog-schemas.test.ts`
- `tests/phase-4-first-product.test.tsx`
- `tests/product-package.test.tsx`
- `tests/product-package-manifest.test.ts`
- `docs/product-file-ingestion.md`
- `docs/product-package-workflow.md`
- `docs/phase-6-real-product-files.md`

## Estado final

- Producto: **NO PUBLICADO**.
- Visibilidad: `editorial_preview`.
- Publicación: `false`.
- Paquete: `ready_for_review`.
- Archivos del producto: 22 recibidos y verificados; 0 aprobados.
- Responsable editorial: formalizado.
- Revisor jurídico: formalizado.
- Titularidad patrimonial: documentada.
- Licencia comercial: pendiente de aprobación.
- Precio y moneda: pendientes.
- Autorización de publicación: pendiente.
- Descargas públicas y compra: inexistentes.
- Respaldo de cesión: privado, no entregable y no visible.
- Servicios externos y despliegue: no conectados.
