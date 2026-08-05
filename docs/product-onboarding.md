# Incorporación de plantillas reales

El inventario editorial se alimentará únicamente con productos reales proporcionados y autorizados por el titular. `data/template-catalog.ts` puede contener registros internos en estados previos a publicación, pero la interfaz pública debe excluirlos hasta que superen todos los controles de publicación.

## Información necesaria

1. Archivo original y prueba de derecho de uso o autoría.
2. Título comercial aprobado; no derivarlo automáticamente del nombre del archivo.
3. Categoría, materia y jurisdicción.
4. Formato de entrega y nivel de personalización.
5. Responsable editorial identificado internamente.
6. Fecha de revisión y normativa contrastada.
7. Supuestos de uso, exclusiones y advertencias.
8. Precio y moneda aprobados por el titular.
9. Licencia de uso definitiva.
10. Archivo de entrega sin datos personales ni metadatos indebidos.

## Procedimiento

1. Crear un identificador interno estable.
2. Registrar el archivo de origen sin publicarlo.
3. Completar la ficha en `docs/product-record-template.md`.
4. Abrir un registro `EditorialReviewEntry` por etapa.
5. Validar el producto con `templateProductSchema`.
6. Verificar que la última etapa esté autorizada.
7. Incorporar el registro real al inventario editorial; esto no lo convierte en producto público.
8. Ejecutar pruebas, revisión visual y aprobación antes de publicar.

## Prohibiciones

- No usar documentos de clientes como plantilla sin autorización y anonimización.
- No publicar nombres, firmas, DNI, direcciones, expedientes ni metadatos personales.
- No inventar vigencia, responsable, precio, licencia o jurisdicción.
- No sobrescribir versiones publicadas; se crea historial y nueva versión.
- No mantener a la venta una plantilla retirada.
- No habilitar enlaces cuando el archivo solo tenga nombre y carezca de ubicación final o autorización pública.

## Primer registro incorporado

`BL-LEG-CON-001` está registrado con estado `approved` para aprobación interna y disponibilidad `editorial_preview`. Sus nombres de archivo están inventariados, pero todas las referencias de ubicación permanecen en `null` y las autorizaciones de descarga en `false`.

El catálogo público continúa vacío porque faltan precio, licencia, responsable editorial, autorización de publicación, ubicación final de archivos y política comercial.

## Control del paquete documental

Cada nombre previsto se incorpora como `ProductDocument` con audiencia, propósito, formato, estado, intención de entrega, disponibilidad, autorización y referencia. Un nombre sin archivo real conserva `status: "planned"`, `fileRef: null` y `downloadable: false`.

Antes de cambiar un documento a `received`, `verified` o `approved` debe existir evidencia real para ese estado. El paquete no puede declararse listo para publicación mientras conserve requisitos con `resolved: false`.
