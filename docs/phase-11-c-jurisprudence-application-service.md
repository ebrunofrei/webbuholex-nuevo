# Servicio de aplicación jurisprudencial — Fase 11.C

## Propósito y límites

La capa coordina el dominio 11.A y el repositorio 11.B mediante una fachada TypeScript solo servidor. No existe endpoint, transporte, autenticación, scraping, IA, datos reales ni conexión con `/jurisprudencia`.

## Arquitectura

`JurisprudenceInternalApi` delega en una única instancia de `JurisprudenceApplicationService`; esta aplica esquemas, reglas de publicación y DTO y usa el puerto `JurisprudenceRepository`. Los adaptadores no son visibles a través de la fachada.

## Casos de uso

- crear y actualizar registros completos;
- obtener por id, slug o identidad externa;
- listar, buscar y contar internamente;
- consultar historial;
- evaluar bloqueos de publicación sin mutar;
- buscar proyecciones públicas publicables;
- obtener detalle público sin revelar registros privados;
- cerrar recursos.

## Contexto

Cada operación recibe requestId, actor opaco, origen y fecha. Los actores permitidos son `system`, `editorial_operator` e `internal_test`. El contexto no contiene correo, DNI, IP, token o sesión y no concede autorización.

## Comandos

Creación exige registro nuevo e idempotency key. El consumidor no controla id, versión o timestamps. Actualización exige id, versión esperada, tipo de cambio y registro completo. No existen patches.

## Consultas y DTO

Las colecciones están paginadas y limitadas a 50. Los resúmenes internos no contienen contenido completo ni controles. El detalle interno clona ramas y elimina ubicación física. El historial devuelve snapshots sanitizados. Los DTO públicos reutilizan 11.A.

## Publicación

La evaluación ejecuta `getJurisprudencePublicationBlockers`. La búsqueda pública exige estados mínimos y vuelve a aplicar `isJurisprudenceRecordPublic`. No se publica ni modifica ningún registro. Inexistente y privado se presentan al consumidor público como `not_found`.

## Errores

La aplicación usa excepciones estructuradas y códigos propios. No filtra mensajes de driver, SQL, rutas o causas. `PERSISTENCE_ERROR` se traduce a `REPOSITORY_UNAVAILABLE`; conflictos seguros conservan código y detalles mínimos.

## Logging

El logger inyectable recibe únicamente metadatos operativos. El logger nulo es predeterminado. Nunca recibe texto jurídico, payload, documentos, datos personales, SQL o rutas.

## Factory y ciclo de vida

La factory acepta un repositorio inyectado. Las variantes de memoria y SQLite no crean estado global. SQLite exige ruta explícita fuera del repositorio Git. `close` es idempotente y bloquea operaciones posteriores.

## Seguridad y privacidad

No se permite búsqueda por DNI o nombre de parte, perfilado, texto completo en logs ni exposición de contenido no autorizado. Fuente verificada no equivale a autorización de republicación. No hay anonimización automática.

## Pruebas

La matriz ejecuta la misma fachada con memoria y SQLite `:memory:` y añade reapertura de archivo temporal. Comprueba comandos, consultas, errores, publicación, proyecciones, logging, cierre, equivalencia y fronteras estáticas.

## Limitaciones y 11.D

La búsqueda pública recorre hasta un límite interno y declara `partial` si lo alcanza. PostgreSQL, autorización, transporte HTTP, rate limiting, consulta full-text y conexión UI quedan diferidos. 11.D podrá diseñar transporte solo después de aprobar política de exposición y seguridad.
