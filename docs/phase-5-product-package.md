# BúhoLex v2 — Fase 5: paquete comercial y control de publicación

Fecha: 27 de julio de 2026
Producto: `BL-LEG-CON-001 — Contrato de Arrendamiento de Vivienda`

## Implementado

- Modelo tipado para documento, audiencia, propósito, formato, estado, paquete, requisito, error de integridad y entrega manual.
- Esquemas Zod para documentos, paquete y entrega manual futura.
- Inventario documental local con 19 registros:
  - 2 internos;
  - 16 destinados al cliente;
  - 1 de información pública.
- Clasificación de tres contratos, ocho anexos, guía PDF, fuente Word de guía, checklist Word/PDF, licencia, ficha técnica y Léeme.
- Estado del paquete calculado como `incomplete`.
- Diez requisitos estructurados de publicación, todos pendientes.
- Control puro de integridad con errores estructurados.
- Protección adicional del catálogo público mediante el estado y requisitos del paquete.
- Vista previa editorial disponible solo en `development`, con resumen, indicadores calculados, tabla de inventario y bloqueos.
- Contrato `ManualProductDelivery` sin implementación de entrega.
- Pruebas para clasificación, estados, duplicados, retirados, descargas, entrega interna, conteos, visibilidad y esquema.

La guía PDF se registra como `planned`: aunque fue informada como preparada, no está incorporada dentro del proyecto y por tanto no puede marcarse `received` o `verified`. La misma regla se aplica a su fuente Word y a los demás nombres previstos.

## Validado mediante herramienta oficial

Ninguna de las cuatro herramientas oficiales llegó a analizar el proyecto. No se afirma que lint, TypeScript, Vitest o la compilación hayan pasado.

## Comprobado alternativamente

Comprobaciones no destructivas completadas:

- sintaxis de 32 archivos fuente `.ts` aceptada por Node 22 con eliminación experimental de tipos;
- cero usos explícitos de `any` en tipos, esquemas, datos, componentes, páginas y pruebas;
- 19 documentos y 19 identificadores únicos;
- 2 documentos internos, 16 para cliente y 1 informativo público;
- 3 contratos y 8 anexos;
- 1 guía PDF prevista y 1 fuente Word interna;
- 4 propósitos auxiliares pendientes: checklist, licencia, ficha técnica y Léeme;
- 19 estados `planned`;
- 10 requisitos de publicación sin resolver;
- 0 rutas, 0 descargas y 0 disponibilidad pública;
- estado calculado y recalculado `incomplete`;
- control de integridad sin errores para el inventario actual;
- detección positiva de identificador duplicado;
- detección positiva de documento retirado marcado como entregable;
- producto excluido del catálogo público;
- ausencia de rutas locales, públicas o externas en los registros productivos de Fase 5.

Estas comprobaciones ejecutan datos y funciones puras, pero no sustituyen la comprobación de tipos, pruebas de componentes, accesibilidad, lint ni compilación.

## No validado por bloqueo EPERM

| Comando | Resultado | Ruta exacta bloqueada |
|---|---|---|
| `pnpm lint` | `EPERM` antes de ejecutar ESLint | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\eslint\bin\eslint.js` |
| `pnpm typecheck` | `EPERM` antes de ejecutar TypeScript | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\typescript\bin\tsc` |
| `pnpm test` | `EPERM` antes de ejecutar Vitest | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\vitest\vitest.mjs` |
| `pnpm build` | `EPERM` antes de ejecutar Next.js | `C:\Users\USER\Documents\Codex\2026-07-27\files-mentioned-by-the-user-necesito\buholex-v2\node_modules\next\dist\bin\next` |

No se cambiaron permisos, dependencias, `package.json` ni el lockfile. No se eliminó ni reconstruyó `node_modules`.

## Pendiente del titular

1. Precio aprobado.
2. Moneda aprobada.
3. Licencia definitiva y PDF aprobado.
4. Responsable editorial real.
5. Autorización expresa de publicación.
6. Incorporación y verificación de todos los archivos reales.
7. Definición final de los documentos auxiliares obligatorios.
8. Canal institucional de entrega.
9. Política comercial.
10. Reglas de reembolso.

También debe definirse si la ficha técnica y comercial será obligatoria antes de publicar o un documento informativo posterior. Actualmente está clasificada como opcional o posterior y no modifica el bloqueo de documentos auxiliares entregables.

## No conectado

- almacenamiento o base de datos;
- backend;
- correo o enlace temporal;
- ZIP o generación automática de paquetes;
- pagos;
- WhatsApp;
- OpenAI;
- analítica;
- firma digital;
- `buholex.com`.

## No publicado

- Producto: `approved`.
- Disponibilidad: `editorial_preview`.
- Paquete: `incomplete`.
- Catálogo público: excluido.
- Descargas: cero.
- Rutas: cero.
- Solicitudes activas: cero.

## Archivos creados

- `types/product-package.ts`
- `lib/schemas/product-package.ts`
- `data/product-packages.ts`
- `lib/product-package-integrity.ts`
- `components/product-package-preview.tsx`
- `tests/product-package.test.tsx`
- `docs/product-package-workflow.md`
- `docs/phase-5-product-package.md`

## Archivos modificados

- `types/domain.ts`
- `lib/schemas.ts`
- `lib/catalog-visibility.ts`
- `components/template-catalog.tsx`
- `components/template-editorial-preview.tsx`
- `app/plantillas/legales/page.tsx`
- `app/globals.css`
- `tests/phase-4-first-product.test.tsx`
- `tests/accessibility.test.tsx`
- `docs/product-onboarding.md`
- `docs/product-record-template.md`
- `docs/editorial-workflow.md`
- `docs/manual-sales-flow.md`
- `docs/phase-4-first-product.md`
- `README.md`

## Restricciones vigentes

- No publicar.
- No conectar servicios externos.
- No habilitar descargas ni solicitudes.
- No registrar rutas hasta recibir y verificar archivos reales.
- No asignar precio, moneda, licencia o responsables por inferencia.
- No modificar ni generar Word, PDF o ZIP.
- No entregar ni mostrar públicamente la plantilla maestra.
- No cambiar el paquete a `ready_for_publication` mientras exista un requisito pendiente.
