# BúhoLex v2 — Fase 6: incorporación física y cierre documental

Fecha: 27 de julio de 2026
Producto: `BL-LEG-CON-001 — Contrato de Arrendamiento de Vivienda`

## Resultado

Los 22 registros documentales quedaron vinculados a archivos físicos reales bajo `product-assets/BL-LEG-CON-001`. Todos existen, son legibles, coinciden por nombre, clasificación y formato, y tienen tamaño y SHA-256 calculados desde sus bytes. Los 22 estados son `verified`; ninguno es `approved`, descargable o público.

El paquete pasó por cálculo de `incomplete` a `ready_for_review`. La integridad documental es `valid`, pero 9 bloqueos comerciales o editoriales impiden avanzar a empaquetado, publicación, venta o entrega.

## Ruta fuente utilizada

`product-assets/BL-LEG-CON-001`

Las referencias persistidas son relativas al proyecto. No se almacenan rutas absolutas, URLs ni referencias fuera de la raíz privada del producto.

## Estructura encontrada

La carpeta contiene 39 archivos físicos:

- 22 documentos correspondientes al inventario tipado;
- 4 documentos de revisión en `02_FUENTES_Y_REVISION`;
- 8 anexos maestros auxiliares en `03_EDICION/ANEXOS`;
- 1 fuente Word auxiliar del checklist en `03_EDICION/DOCUMENTOS_DEL_PRODUCTO`;
- 1 changelog y 1 versión histórica en `06_VERSIONES`;
- `LEEME.txt` y `metadata.json`.

Los 17 archivos auxiliares o históricos no se incorporaron automáticamente al inventario comercial. Se conservaron intactos. No existe un ZIP de auditoría ni se detectaron `desktop.ini`, `Thumbs.db`, `.DS_Store` o temporales de Word.

Las carpetas preparatorias `customer`, `internal` y `public-information` están vacías y permanecen así. La arquitectura usa referencias a los originales privados de `03_EDICION` y `04_PRODUCTO_PUBLICO`; copiar archivos habría creado duplicados innecesarios.

## Inventario real verificado

Fecha técnica de verificación: `2026-07-28T01:19:27.797Z`.

| Identificador | Audiencia | Ruta privada relativa | Bytes | SHA-256 |
|---|---|---|---:|---|
| `bl-leg-con-001-contract-1` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/01_CONTRATOS_EDITABLES/01-Contrato-Arrendamiento-Vivienda-Ordinario.docx` | 78006 | `c3f72d9eeeab480ee582cf1f483b265065bbc99679c6912c5b1d608cdc79d888` |
| `bl-leg-con-001-contract-2` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/01_CONTRATOS_EDITABLES/02-Contrato-Arrendamiento-Vivienda-Allanamiento-Futuro.docx` | 80382 | `464ba41e1106c272684f9e53985167b16847fc489df7d9f7d9b43281e95f1ee7` |
| `bl-leg-con-001-contract-3` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/01_CONTRATOS_EDITABLES/03-Contrato-Arrendamiento-Vivienda-Ley-30933.docx` | 83729 | `d0ab3a252b35f1b23859660c487d917b0f6be80ac3096e6aee5dbd9c2c57bbff` |
| `bl-leg-con-001-annex-1` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/01-Anexo-Acta-de-Entrega-e-Inventario.docx` | 42967 | `149dbbdee83b32e8c259d91fc658d0424b46ab0dca8789b939755e358a1c8650` |
| `bl-leg-con-001-annex-2` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/02-Anexo-Acta-de-Devolucion-del-Inmueble.docx` | 45307 | `72146594eab5abad5b5ee1e893a40f847aef8f0d2d652d390fd8ef3b9a457e83` |
| `bl-leg-con-001-annex-3` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/03-Anexo-Registro-Fotografico-Inicial.docx` | 35514 | `d40459be7e647ec27e357cfbc107ed148dce71b1ec40849c97c021680bec8b5d` |
| `bl-leg-con-001-annex-4` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/04-Anexo-Constancia-Reglamento-Interno.docx` | 35650 | `4fa459d998d84fcebca45c68bc890d2472e39775e89f290e1f19c882e4403ae1` |
| `bl-leg-con-001-annex-5` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/05-Anexo-Relacion-de-Ocupantes-Autorizados.docx` | 36192 | `c73e06e1b71fffab83ac61a4f96f691470c87e48757df8125fa6b2c5dd56cda2` |
| `bl-leg-con-001-annex-6` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/06-Anexo-Autorizacion-y-Condiciones-para-Mascotas.docx` | 36128 | `75756e880d7cc4c9993c9132ac8c9a07518f539a7ba839a76865c47e0098a7a5` |
| `bl-leg-con-001-annex-7` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/07-Anexo-Autorizacion-de-Mejoras-Instalaciones-o-Modificaciones.docx` | 38082 | `759d139a449d74002ed98a110fd71b0b8bc009003f5eaeb6debc9bb33ff80a80` |
| `bl-leg-con-001-annex-8` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/08-Anexo-Cronograma-y-Constancia-del-Primer-Pago.docx` | 39719 | `8cf00f19a124078d22a1a275f179e9104d17503bc13f09a7e97a6dbe05eeaa5e` |
| `bl-leg-con-001-guide-pdf` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/03_GUIA_DE_USO/GUIA-DE-USO-Y-PERSONALIZACION-BL-LEG-CON-001.pdf` | 137964 | `1de05e63a8eda419141fa141593daaa40faaffe9949ab39312f4b1e7215f4952` |
| `bl-leg-con-001-checklist-docx` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/04_LISTAS_DE_VERIFICACION/CHECKLIST-PREVIO-A-LA-FIRMA-BL-LEG-CON-001.docx` | 35371 | `0123301f913beb44c0311767d4396d92e12657439333ae788ef00cb5e4f447b1` |
| `bl-leg-con-001-checklist-pdf` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/04_LISTAS_DE_VERIFICACION/CHECKLIST-PREVIO-A-LA-FIRMA-BL-LEG-CON-001.pdf` | 75223 | `5d7c993e1e63a1155aba4cbb1b32904ebb60c777640de93119bd4afdd2dfbbdc` |
| `bl-leg-con-001-license-pdf` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/05_INFORMACION_DEL_PRODUCTO/LICENCIA-DE-USO-BL-LEG-CON-001.pdf` | 55123 | `aad6629907f9345d77cc255ec450d5e663195ee3c392be53fe64bf0b2d289d67` |
| `bl-leg-con-001-readme-pdf` | Cliente | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/05_INFORMACION_DEL_PRODUCTO/LEEME-BL-LEG-CON-001.pdf` | 53950 | `dd3dee381a79fefba23f956e762d525702e8fd163290ad22f480274131b2da2d` |
| `bl-leg-con-001-technical-sheet-pdf` | Información futura | `product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/05_INFORMACION_DEL_PRODUCTO/FICHA-TECNICA-Y-COMERCIAL-BL-LEG-CON-001.pdf` | 65127 | `7c425ad9b15ca037c46856c46a41fbfb555d51b0fd26e84865783bc8d1ce1183` |
| `bl-leg-con-001-master-source` | Interno | `product-assets/BL-LEG-CON-001/03_EDICION/contrato-arrendamiento-vivienda-plantilla-maestra-v0.10.docx` | 91448 | `ffa0620b4ec8361224dd2435756c3e6d916507b81e32480ab5039eea4ebb5681` |
| `bl-leg-con-001-guide-source` | Interno | `product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/GUIA-DE-USO-Y-PERSONALIZACION-BL-LEG-CON-001.docx` | 40544 | `8038e6e81ca2f5fd22407f7cb701f4d5e1d22e27b9da738b6890dacef78d2746` |
| `bl-leg-con-001-license-source` | Interno | `product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/LICENCIA-DE-USO-BL-LEG-CON-001.docx` | 33493 | `a6a0e0ce2536a06173e5b0a7e1d4dbf44c8a2ae26d7ed1716ceb509dc0b9d892` |
| `bl-leg-con-001-technical-sheet-source` | Interno | `product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/FICHA-TECNICA-Y-COMERCIAL-BL-LEG-CON-001.docx` | 33231 | `bb8fb401dddde06226389b8535ef4e07367f53be2ad331e568f6e59dda8d8d05` |
| `bl-leg-con-001-readme-source` | Interno | `product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/LEEME-BL-LEG-CON-001.docx` | 31877 | `5b740019c06131bb457efa20a83bff0d81aae85efe399587589243d4875b011e` |

Tamaño total calculado: **1 205 027 bytes**.

## Conteos del manifiesto

- Documentos registrados: 22.
- Recibidos: 22.
- Verificados: 22.
- Aprobados: 0.
- Pendientes o faltantes: 0.
- Destinados al cliente: 16.
- Internos: 5.
- Información pública futura: 1.
- Rutas privadas persistidas: 22.
- Descargas: 0.
- URLs públicas: 0.
- Errores de integridad: 0.
- Estado de integridad: `valid`.
- Estado del paquete: `ready_for_review`.

`receivedCount` es acumulativo: un documento `verified` necesariamente fue recibido. `approvedCount` permanece separado y en cero.

## Verificación documental

- Los 17 DOCX abrieron como paquetes OOXML válidos, sin entradas ZIP dañadas, con `word/document.xml` legible y contenido coherente con el producto.
- Los 5 PDF abrieron correctamente, contienen texto y suman 15 páginas.
- Las 15 páginas PDF fueron rasterizadas e inspeccionadas visualmente sin detectar recortes, solapamientos, páginas vacías ni problemas de legibilidad.
- LibreOffice no está instalado, por lo que el renderizador DOCX oficial devolvió `FileNotFoundError` al buscar `soffice`.
- Microsoft Word está instalado, pero la automatización COM no pudo iniciar por `0x80070520` (sesión de inicio inexistente). Por ello no se afirma validación visual de los DOCX; su verificación fue estructural y de legibilidad OOXML.

Ningún documento fue modificado, renombrado, reexportado ni sustituido.

## `metadata.json`

El JSON es sintácticamente válido y conserva:

- `code`: `BL-LEG-CON-001`;
- `version`: `0.10`;
- `editorialStatus`: `approved`;
- `visibility`: `editorial_preview`;
- `published`: `false`;
- `price`: `null`;
- `currency`: `null`;
- `responsibleEditor`: `null`;
- `legalReviewer`: `null`;
- `license.status`: `pending`;
- `reviewedAt`: `2026-07-27`;
- `nextReviewAt`: `2027-07-27`.

Se hicieron tres correcciones técnicas expresamente requeridas: se añadió `code` sin eliminar `id`, y se reemplazaron los dos valores de revisión que estaban en `null` por las fechas indicadas por el titular. No se completó ningún dato comercial o institucional.

Los 16 nombres de `deliveryFiles` son únicos y corresponden exactamente con los 16 documentos físicos de audiencia cliente. La ficha técnica PDF existe, pero no pertenece a `deliveryFiles`.

## Duplicados, faltantes y exposición

- Identificadores duplicados: 0.
- Nombres duplicados entre los 22 registros: 0.
- Referencias duplicadas: 0.
- Hashes duplicados entre los 22 registros: 0.
- Hashes duplicados inesperados entre los 39 archivos físicos: 0.
- Archivos registrados faltantes: 0.
- Archivos del producto dentro de `public/`: 0.
- URLs públicas: 0.
- Descargas habilitadas: 0.

## Bloqueos resueltos

Diez controles quedaron resueltos por evidencia física:

- `deliverable_routes_verified`;
- `commercial_files_received`;
- `contracts_received`;
- `annexes_received`;
- `guide_received`;
- `checklist_received`;
- `readme_received`;
- `license_file_received`;
- `technical_sheet_received`;
- `document_integrity_verified`.

## Bloqueos activos

Permanecen 9 bloqueos:

- `price_approved`;
- `currency_approved`;
- `license_approved`;
- `editorial_owner_identified`;
- `legal_reviewer_identified`;
- `publication_authorized`;
- `required_auxiliary_documents` — los documentos existen, pero los auxiliares todavía no tienen aprobación editorial;
- `delivery_channel_approved`;
- `commercial_refund_rules`.

La existencia de `LICENCIA-DE-USO-BL-LEG-CON-001.pdf` resolvió únicamente su recepción y verificación física. `licenseStatus`, `usageLicense` y el bloqueo de aprobación no cambiaron.

## Validación oficial

Los comandos se ejecutaron en el orden solicitado, pero ninguno llegó a analizar el proyecto debido a `EPERM`:

| Comando | Resultado | Ruta bloqueada |
|---|---|---|
| `pnpm lint` | `EPERM` antes de ESLint | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\eslint\bin\eslint.js` |
| `pnpm typecheck` | `EPERM` antes de TypeScript | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\typescript\bin\tsc` |
| `pnpm test` | `EPERM` antes de Vitest | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\vitest\vitest.mjs` |
| `pnpm build` | `EPERM` antes de Next.js | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\next\dist\bin\next` |

No se cambiaron permisos, dependencias, `package.json`, lockfile ni `node_modules`.

## Comprobaciones alternativas

- Ejecución de datos y funciones puras: 22 documentos, 22 identificadores, nombres, rutas y hashes únicos; 22 recibidos y verificados; 0 aprobados y faltantes; 1 205 027 bytes; 9 bloqueos; `ready_for_review`; manifiesto `valid`; 0 errores de integridad; producto no disponible públicamente.
- Relectura independiente de los 22 archivos y recálculo de cada tamaño y hash: 0 discrepancias.
- Apertura estructural: 22 de 22 legibles y coherentes con el producto.
- Ausencia de archivos del producto en `public/`, temporales y URLs públicas.
- Comprobación sintáctica de archivos TypeScript sin JSX y búsqueda de `any` explícito documentadas en la revisión final.

Estas comprobaciones no sustituyen lint, typecheck, Vitest ni build.

## Pruebas actualizadas

- Resolución física de los 22 documentos.
- Recálculo de tamaños y SHA-256 contra archivos reales.
- Correspondencia exacta de los 16 `deliveryFiles`.
- Cinco internos y una ficha informativa futura.
- Unicidad de identificadores, nombres, referencias y hashes.
- Manifiesto, tamaño total, estados y bloqueos.
- Licencia física verificada sin aprobación editorial.
- Ausencia de descarga, URL pública y publicación.
- Protección de plantilla maestra y fuentes internas.
- Exclusión del catálogo público y vista editorial solo en desarrollo.

## Archivos creados

Ninguno dentro del proyecto.

## Archivos modificados

- `product-assets/BL-LEG-CON-001/metadata.json`
- `README.md`
- `types/product-package.ts`
- `lib/schemas/product-package.ts`
- `data/product-file-inventory.ts`
- `data/product-packages.ts`
- `lib/product-file-verification.ts`
- `lib/product-package-manifest.ts`
- `lib/product-package-integrity.ts`
- `components/product-package-preview.tsx`
- `tests/product-package.test.tsx`
- `tests/product-file-verification.test.ts`
- `tests/product-package-manifest.test.ts`
- `docs/product-file-ingestion.md`
- `docs/product-package-workflow.md`
- `docs/phase-6-real-product-files.md`

## Estado final obligatorio

- Producto: **NO PUBLICADO**.
- Visibilidad: `editorial_preview`.
- Publicación: `false`.
- Paquete: `ready_for_review`, verificado documentalmente y bloqueado comercialmente.
- Descargas públicas: inexistentes.
- URLs públicas: inexistentes.
- Precio: pendiente.
- Moneda: pendiente.
- Licencia: archivo verificado, aprobación pendiente.
- Responsable editorial: pendiente.
- Revisor jurídico: pendiente.
- Autorización de publicación: pendiente.
- Plantilla maestra y fuentes internas: protegidas.
- Catálogo público: producto excluido.
- Servicios externos: no conectados.

## Transición a Fase 7

Con posterioridad al cierre físico aquí documentado, la Fase 7 formalizó responsable editorial, revisor jurídico, autoría y titularidad patrimonial. El inventario físico permanece idéntico: 22 documentos recibidos y verificados, 0 aprobados y 0 públicos. El conteo vigente de bloqueos pasó de 9 a 7; el detalle actualizado se encuentra en `docs/phase-7-editorial-formalization.md`.
