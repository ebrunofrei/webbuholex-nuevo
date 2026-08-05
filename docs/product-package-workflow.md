# Flujo del paquete documental

## Alcance

El paquete de `BL-LEG-CON-001` es un inventario editorial local. Registrar un nombre de archivo no acredita que el archivo exista, esté verificado, sea entregable o pueda descargarse.

## Clasificación

### Interno

- plantilla maestra del contrato;
- fuente Word de la guía;
- fuentes Word de guía, licencia, ficha técnica y Léeme;
- futuros documentos editoriales no entregables.

Estos documentos deben conservar audiencia `internal` y nunca pueden ser entregables, descargables o publicables.

### Cliente

- tres contratos Word;
- ocho anexos Word;
- guía PDF;
- checklist Word y PDF;
- licencia PDF;
- Léeme PDF.

La intención futura de entrega se registra por separado de la disponibilidad actual. Un documento puede estar destinado al cliente y seguir sin ser entregable mientras esté planificado o carezca de archivo verificado.

### Información pública

- ficha técnica y comercial PDF.

Su aprobación futura no implica una ruta pública automática. Requiere archivo verificado y autorización expresa.

## Estados documentales

```text
planned → received → verified → approved
                         ↘ replaced
                         ↘ withdrawn
```

- `planned`: nombre previsto, sin archivo incorporado.
- `received`: archivo recibido, todavía no verificado.
- `verified`: identidad, formato y ubicación comprobados.
- `approved`: autorizado para su finalidad concreta.
- `replaced`: sustituido por una versión posterior.
- `withdrawn`: excluido del paquete y de toda entrega.

## Estados del paquete

```text
draft
→ incomplete
→ ready_for_review
→ approved_for_packaging
→ ready_for_publication
→ published
↘ withdrawn
```

El estado se calcula desde los documentos y requisitos. Los 22 registros de `BL-LEG-CON-001` ya tienen archivo, referencia privada, tamaño, hash y verificación técnica. El paquete alcanzó `ready_for_review`, pero no `approved_for_packaging` ni `ready_for_publication`: tras formalizar responsable editorial y revisor jurídico, 7 requisitos comerciales o editoriales continúan pendientes.

La acreditación privada de autoría y cesión patrimonial se gestiona fuera del inventario comercial. No suma documentos al paquete, no entra en `deliveryFiles` y no modifica por sí sola el estado de publicación.

## Documentos obligatorios y posteriores

Son obligatorios antes de publicar los contratos, anexos, plantilla maestra interna localizada, guía PDF, checklist Word y PDF, licencia PDF y Léeme PDF. La ficha técnica y comercial se registra como documento informativo opcional o posterior hasta que el titular defina y apruebe su uso público.

## Estructura documental objetivo

Esta estructura describe organización editorial; no constituye una ruta del sistema ni crea carpetas o archivos:

```text
BL-LEG-CON-001-CONTRATO-ARRENDAMIENTO-VIVIENDA
├── 01_INVESTIGACION
├── 02_BORRADORES
├── 03_EDICION
│   ├── contrato-arrendamiento-vivienda-plantilla-maestra-v0.10.docx
│   ├── ANEXOS
│   └── DOCUMENTOS_DEL_PRODUCTO
└── 04_PRODUCTO_PUBLICO
    ├── 01_CONTRATOS_EDITABLES
    ├── 02_ANEXOS_EDITABLES
    ├── 03_GUIA_DE_USO
    ├── 04_LISTAS_DE_VERIFICACION
    └── 05_INFORMACION_DEL_PRODUCTO
```

## Integridad

`validateProductPackageIntegrity` devuelve errores con código, documento y mensaje. Controla identificadores, nombres y hashes duplicados; referencias absolutas, públicas o externas; estados incoherentes con archivos y metadatos; fuentes internas; plantilla maestra; documentos retirados o reemplazados; descargas, autorización, versión, licencia y bloqueos activos.

La incorporación física se realiza exclusivamente bajo `product-assets/BL-LEG-CON-001/`, fuera de `public/`. La ruta solo se registra después de comprobar existencia, nombre, formato y ubicación. Tamaño y SHA-256 se calculan desde los bytes reales. La transición a `verified` requiere además una inspección explícita; nunca se deduce `approved`. Las rutas actuales apuntan a los originales privados de `03_EDICION` y `04_PRODUCTO_PUBLICO`; las carpetas preparatorias vacías no reciben copias duplicadas.

## Entrega manual futura

`ManualProductDelivery` registra pedido, producto, versión, identificadores entregados, fecha, responsable, evidencia y confirmación del cliente. No envía, comprime, firma, almacena ni genera documentos.
