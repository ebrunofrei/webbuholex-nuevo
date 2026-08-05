# Flujo de ingesta jurisprudencial

La ingesta está modelada y deshabilitada. No se ejecuta scraping, OCR, descarga ni almacenamiento.

1. Descubrimiento.
2. Localización oficial.
3. Recuperación privada autorizada.
4. Cálculo de hash y tamaño.
5. Extracción de texto.
6. Conservación de paginación.
7. Segmentación.
8. Clasificación jurídica.
9. Extracción preliminar.
10. Revisión editorial.
11. Aprobación.
12. Disponibilidad para recuperación.

Estados: `discovered`, `metadata_imported`, `official_link_verified`, `document_downloaded`, `integrity_verified`, `parsed`, `editorially_reviewed`, `approved`, `stale` y `source_unavailable`.

Una resolución que no pueda procesarse solo podrá conservar una ficha mínima y su enlace oficial. No se presentará como analizada. Los libros y manuales son ayudas privadas de descubrimiento: autor, editorial, ISBN, portada, título comercial, página y ruta privada no forman parte de la ficha pública.
