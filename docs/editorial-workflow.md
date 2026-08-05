# Flujo de revisión editorial

```text
Inventariada
→ Anonimizada
→ Revisión jurídica
→ Revisión de vigencia normativa
→ Preparación comercial
→ Aprobada
→ Publicada
→ Actualizada o retirada
```

## Evidencia mínima por etapa

Todo `EditorialReviewEntry` registra:

- referencia privada del archivo de origen;
- identificador del producto;
- estado de la etapa;
- responsable de revisión;
- fecha;
- cambios realizados;
- versión pública;
- normas revisadas;
- observaciones;
- autorización de publicación, autorizante y fecha.

`approved` representa aprobación editorial interna y no equivale a publicación. Los estados `published` y `updated` no validan si la autorización está incompleta. Las transiciones permitidas están en `data/editorial-workflow.ts`.

## Criterios de salida

- **Inventariada:** autoría, licencia y archivo identificados.
- **Anonimizada:** no quedan datos personales ni metadatos del caso de origen.
- **Revisión jurídica:** estructura, cláusulas y supuestos revisados.
- **Vigencia normativa:** fuentes y fecha de contraste registradas.
- **Preparación comercial:** ficha, advertencias, licencia y formato preparados.
- **Aprobada:** contenido cerrado internamente; todavía puede tener bloqueos comerciales o de publicación.
- **Publicada:** registro coincide con el archivo entregable.
- **Actualizada:** nuevo historial sin sobrescribir la versión anterior.
- **Retirada:** no admite nuevas solicitudes.

## Puerta adicional del paquete

La aprobación editorial interna no sustituye la preparación documental. Para pasar a `published` o `updated`, el paquete asociado también debe alcanzar `ready_for_publication`, no conservar bloqueos y superar el control de integridad. Un paquete `incomplete` mantiene el producto fuera del catálogo aunque el producto esté `approved`.
