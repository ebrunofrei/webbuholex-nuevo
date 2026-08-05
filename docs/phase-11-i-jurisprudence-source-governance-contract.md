# Contrato de gobierno de fuentes — Fase 11.I

## Fuente

`JurisprudenceSourceRecord` conserva clasificación, origen institucional, jurisdicción, referencia documental, custodia, procedencia, integridad, derechos, privacidad, disponibilidad, verificación, checksum y fingerprint. `sourceId`, versión de metadata y fechas de control son generados por el sistema.

No contiene texto jurídico, partes, identificadores personales, credenciales, rutas, SQL ni secretos. Las URLs admitidas deben ser HTTPS y no pueden contener usuario, contraseña, query o fragmento.

## Clasificación y default deny

El catálogo distingue portal judicial oficial, publicación oficial, copia emitida por tribunal, copia certificada, archivo institucional, aporte privado autorizado y referencia secundaria. Una fuente secundaria exige justificación opaca y no puede elevarse automáticamente a primaria.

`public_display_permitted` es el único estado de derechos que puede contribuir a un expediente completo. El checksum acredita igualdad técnica del contenido evaluado, no autenticidad ni oficialidad.

## Vínculos

`JurisprudenceSourceBinding` fija fuente, registro y versión. La sustitución conserva el vínculo anterior como `superseded`, registra el reemplazo y nunca borra historial. Una fuente disputada o una versión distinta no pueden crear un vínculo vigente.

## Validación

Los comandos usan Zod estricto, límites de longitud y listas, fechas seguras, referencias opacas e idempotency keys controladas. Se rechazan propiedades desconocidas y campos de publicación controlados por sistema.

## Validación oficial

Los contratos de gobierno de fuentes quedaron aprobados en la copia externa física y equivalente: los controles focalizados y los cuatro comandos completos terminaron con código 0. La validación global aprobó 41 archivos y 570 pruebas, incluidas 37 pruebas específicas de 11.I, con 46 de 46 páginas generadas. El contrato no admite publicación autorizada o ejecutada y no incorpora fuentes reales.
