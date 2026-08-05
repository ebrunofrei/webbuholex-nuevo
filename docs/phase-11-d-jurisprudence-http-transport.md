# Transporte HTTP interno jurisprudencial — Fase 11.D

## Propósito y límites

La capa convierte `Request` en operaciones de `JurisprudenceInternalApi` y sus resultados en `Response`. Es exclusivamente servidor, no está montada, no constituye API accesible y no conecta `/jurisprudencia`.

## Arquitectura

```text
futuro Route Handler (inexistente)
  → handlers no montados
  → JurisprudenceHttpController
  → JurisprudenceInternalApi
  → servicio, dominio y repositorio
```

## Contratos

Los envelopes de éxito y error usan `ok` como discriminador. Incluyen `meta.requestId` y `meta.generatedAt`; las colecciones añaden paginación. Nunca incluyen actor, clave idempotente, SQL, stack, rutas de base o claves de deduplicación.

La serialización central produce `application/json; charset=utf-8`, `x-request-id` y `Cache-Control: no-store`. No genera CORS, ETag o Server-Timing.

## Operaciones

Públicas internas: búsqueda GET y detalle GET. Editoriales internas no montadas: crear POST, actualizar PUT, listar GET, detalle GET, historial GET y evaluar publicación GET.

No existe método genérico. Un método inválido produce 405 y `Allow` sin leer el body ni ejecutar la API.

## Query, body y headers

La búsqueda admite únicamente los filtros aprobados en 11.A. Se rechazan claves desconocidas, repeticiones, números inválidos, fechas inválidas, rangos invertidos y query mayor a 2048 caracteres.

Crear y actualizar aceptan solo `application/json`, esquemas estrictos y máximo predeterminado de 256 KiB. El límite se comprueba por declaración y lectura real. Se rechazan JSON vacío, inválido, arrays y propiedades desconocidas.

Headers relevantes: `accept`, `content-type`, `content-length`, `x-request-id` e `idempotency-key`. No se aceptan actores, roles o method override desde headers.

## Errores

`VALIDATION_ERROR` se traduce a 400; inexistencia o no publicación a 404; duplicidad, idempotencia y versión a 409; bloqueo de publicación a 422; repositorio o recurso cerrado a 503; fallos desconocidos a 500.

La indistinguibilidad entre detalle privado e inexistente depende del mismo status, código, mensaje y estructura pública. El requestId es metadato de correlación y puede diferir entre solicitudes reales sin revelar la causa del 404.

## RequestId y privacidad

`x-request-id` se valida; uno inválido se reemplaza por un valor generado e inyectable. El mismo valor llega al contexto, log y respuesta. El actor es opaco y controlado por la factory.

No hay filtros por DNI, partes, correo, teléfono, domicilio o IP. No se registra URL, query completa, body, cookies o texto jurídico. Las proyecciones públicas siguen excluyendo `verifiedBy`, notas, contenido generado y ubicaciones privadas.

## Lifecycle y seguridad de importaciones

El controlador no conoce SQLite ni expone la API. La factory no abre recursos al importar. Memoria y SQLite se crean solo mediante invocación explícita. Ningún archivo de `app`, `components` o `data` importa esta infraestructura.

## Pruebas

`tests/phase-11-d-jurisprudence-http-transport.test.ts` usa `Request`/`Response` reales en entorno Node, matriz memoria/SQLite `:memory:`, archivo SQLite temporal, parsers, errores, logging, lifecycle y comprobaciones estáticas.

## Limitaciones y plan 11.E

No hay endpoint, autenticación, autorización, CORS, rate limiting de red ni despliegue. 11.E deberá decidir si existen condiciones para montar únicamente operaciones públicas, mantener bloqueadas las editoriales y configurar lifecycle y persistencia por entorno.
