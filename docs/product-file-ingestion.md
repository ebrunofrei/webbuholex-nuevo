# Incorporación privada de archivos de producto

## Principio de evidencia

Un nombre registrado no demuestra que el archivo exista. Si el archivo no se encuentra físicamente, conserva `status: "planned"`, `fileRef: null`, `fileMetadata: null` y `downloadable: false`.

## Ubicación privada

```text
product-assets/BL-LEG-CON-001/
├── internal/
│   ├── master/
│   └── sources/
├── customer/
│   ├── contracts/
│   ├── annexes/
│   ├── guides/
│   ├── checklists/
│   └── information/
└── public-information/
```

`product-assets/` está excluido del control de versiones. No debe moverse dentro de `public/`, crear URL ni mostrarse como ruta del servidor. Las referencias persistidas son relativas y solo se generan después de comprobar el archivo.

## Flujo

1. Mantener el archivo exacto en su ubicación privada declarada bajo `03_EDICION` o `04_PRODUCTO_PUBLICO`.
2. Ejecutar la inspección local del inventario.
3. Comprobar nombre, extensión, tamaño mayor que cero y firma básica PDF/DOCX.
4. Calcular tamaño y SHA-256 desde el archivo.
5. Registrar `received` y referencia relativa.
6. Abrir e inspeccionar el documento sin modificarlo y registrar la evidencia de clasificación.
7. Solo entonces pasar a `verified` con fecha de inspección.
8. Mantener `approved` reservado a una autorización editorial expresa.

La licencia PDF puede quedar `received` o `verified`, pero su existencia no resuelve `license_approved`. La ficha técnica PDF tampoco obtiene visibilidad pública por existir.

## Clasificación especial

- Plantilla maestra: interna, nunca entregable.
- Fuentes Word de guía, licencia, ficha y Léeme: internas.
- Checklist Word: excepción entregable al cliente.
- Ficha técnica PDF: información pública futura, sin publicación automática.
- Retirados y reemplazados: no entregables.

## Manifiesto

El manifiesto se calcula desde el inventario y contiene únicamente referencias relativas, metadatos reales y conteos derivados. No es un ZIP, no se expone públicamente y no habilita descargas.

## Resolución de ubicaciones existentes

La fuente de verdad física utiliza `03_EDICION` para los cinco documentos internos modelados y `04_PRODUCTO_PUBLICO` para los dieciséis candidatos de entrega y la ficha informativa futura. Las carpetas técnicas `customer`, `internal` y `public-information` permanecen vacías: no se copian documentos porque eso duplicaría archivos válidos y rompería la fuente única de verdad.

Los archivos adicionales de `02_FUENTES_Y_REVISION`, `03_EDICION/ANEXOS` y `06_VERSIONES` son documentación jurídica, fuentes maestras auxiliares o históricos. Se conservan, pero no se incorporan automáticamente a los 22 registros comerciales.

## Situación actual

El 27 de julio de 2026 se localizaron y abrieron los 22 archivos registrados. Sus referencias privadas, tamaños y SHA-256 fueron calculados desde los archivos reales. Los 22 estados son `verified`; ninguno es `approved`, descargable o público. El paquete está en `ready_for_review` y conserva sus bloqueos comerciales y editoriales.

## Respaldo corporativo separado

Los documentos que acreditan autoría o titularidad patrimonial no forman parte del paquete de producto. Se conservan bajo `legal/intellectual-property/<código>/`, fuera de `product-assets`, `deliveryFiles` y cualquier raíz pública. Su verificación técnica puede registrarse en el dominio editorial, pero su nombre, referencia, hash, tamaño, firmas y datos personales no se muestran en la vista editorial ni se trasladan al manifiesto comercial.
