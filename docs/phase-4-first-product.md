# BúhoLex v2 — Fase 4: primer producto jurídico real

Fecha: 27 de julio de 2026
Producto: `BL-LEG-CON-001 — Contrato de Arrendamiento de Vivienda`

## Implementado

- Registro tipado con código, slug, clasificación, versión `0.10`, revisión, contenido comercial proporcionado y estado editorial `approved`.
- Precio pendiente con `priceStatus: "pending"`, `price: null` y `currency: null`.
- Licencia pendiente con `licenseStatus: "pending"`, resumen preliminar aprobado para esta fase y licencia definitiva en `null`.
- Responsable editorial, autorización de publicación, ubicación de archivos y política comercial pendientes.
- Historial editorial `0.1–0.8`, `0.9` y `0.10`, sin inventar fechas, revisores o normas no proporcionadas.
- Registro nominal de una plantilla maestra interna, tres versiones comerciales y ocho anexos.
- Todas las referencias de archivo permanecen en `null`; todas las autorizaciones de descarga permanecen en `false`.
- Vista previa editorial local dentro de `/plantillas/legales/`, visible solo cuando `NODE_ENV !== "production"`.
- Catálogo público protegido mediante un control que exige estado publicable, disponibilidad, precio, licencia, responsable, autorización, archivos y política comercial.
- Pruebas de esquema, unicidad, archivos, pendientes comerciales, visibilidad pública, ficha editorial, ausencia de enlaces y accesibilidad básica.

## Validado

Las siguientes comprobaciones alternativas finalizaron correctamente:

- sintaxis de los 28 archivos fuente `.ts` mediante Node 22 con eliminación experimental de tipos;
- inventario de un solo registro con código `BL-LEG-CON-001` y slug `contrato-arrendamiento-vivienda`;
- tres archivos comerciales y ocho anexos registrados;
- doce nombres de archivo esperados y cero archivos DOCX presentes físicamente en el proyecto;
- todas las referencias de archivo en `null` y cero autorizaciones de descarga;
- precio, moneda, licencia definitiva y responsable editorial en `null`;
- seis bloqueos de publicación activos;
- resultado de visibilidad pública igual a `false`;
- búsqueda estática sin usos explícitos de `any` en tipos, esquemas, datos, componentes, páginas y pruebas.

Estas comprobaciones no sustituyen lint, typecheck, Vitest ni la compilación de Next.js.

## No validado por bloqueo del entorno

Los cuatro comandos se iniciaron, pero sus herramientas no llegaron a analizar el proyecto:

| Comando | Resultado | Ruta bloqueada |
|---|---|---|
| `pnpm lint` | `EPERM: operation not permitted` antes de ESLint | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\eslint\bin\eslint.js` |
| `pnpm typecheck` | `EPERM: operation not permitted` antes de TypeScript | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\typescript\bin\tsc` |
| `pnpm test` | `EPERM: operation not permitted` antes de Vitest | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\vitest\vitest.mjs` |
| `pnpm build` | `EPERM: operation not permitted` antes de Next.js | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\next\dist\bin\next` |

No se modificaron dependencias, permisos, `package.json` ni el lockfile para intentar superar este bloqueo.

## Pendiente del titular

1. Precio y moneda comercial aprobados.
2. Licencia de uso definitiva.
3. Responsable editorial identificado.
4. Autorización expresa de publicación con autorizante y fecha.
5. Política comercial y reglas de personalización.
6. Ubicación final de la plantilla maestra, las tres versiones comerciales y los ocho anexos.
7. Definición exacta del paquete de entrega y autorización individual de archivos públicos.
8. Canal institucional, responsables y condiciones para activar solicitudes o personalización.

## No conectado

- OpenAI o cualquier modelo de IA;
- pagos;
- correo;
- WhatsApp;
- almacenamiento externo;
- backend o base de datos;
- analítica;
- descarga pública;
- `buholex.com`.

## No publicado

El producto conserva `editorialStatus: "approved"` y `availabilityStatus: "editorial_preview"`. No se cambió a `published` o `updated`. La ficha no se incluye en compilaciones de producción y el catálogo público continúa mostrando el estado vacío.

## Archivos creados

- `components/template-editorial-preview.tsx`
- `lib/catalog-visibility.ts`
- `tests/phase-4-first-product.test.tsx`
- `docs/phase-4-first-product.md`

## Archivos modificados

- `types/catalog.ts`
- `types/domain.ts`
- `lib/schemas/catalog.ts`
- `lib/schemas/assistant.ts`
- `data/template-catalog.ts`
- `components/template-catalog.tsx`
- `components/template-product-card.tsx`
- `app/plantillas/legales/page.tsx`
- `app/globals.css`
- `tests/catalog-schemas.test.ts`
- `tests/catalog-state.test.tsx`
- `tests/accessibility.test.tsx`
- `docs/product-onboarding.md`
- `docs/product-record-template.md`
- `docs/editorial-workflow.md`
- `docs/manual-sales-flow.md`
- `README.md`

## Restricciones finales

- No reescribir ni alterar el contenido jurídico de los documentos.
- No crear archivos DOCX sustitutos ni versiones contractuales adicionales.
- No asignar precio, moneda, licencia, responsable o autorizante por inferencia.
- No reemplazar nombres de archivo por rutas ficticias.
- No habilitar descargas hasta recibir los archivos reales y autorización expresa.
- No cambiar el estado editorial a `published` o `updated` hasta superar todos los bloqueos.
- No publicar ni conectar servicios externos.

## Transición a Fase 5

La Fase 5 conserva el registro aprobado y amplía el control desde doce nombres de archivo a un paquete documental tipado. Los seis bloqueos iniciales se mantienen y se detallan en diez requisitos, incluyendo documentos auxiliares, canal de entrega y reglas de reembolso. El estado del paquete es `incomplete`; no modifica el estado editorial ni habilita publicación.
