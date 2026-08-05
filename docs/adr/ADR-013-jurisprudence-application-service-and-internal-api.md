# ADR-013 — Servicio de aplicación y API interna jurisprudencial

- Estado: aceptado para Fase 11.C
- Fecha: 2026-07-29

## Contexto

11.A aprobó dominio y proyecciones; 11.B aprobó puerto y persistencia. Falta una frontera que impida a consumidores futuros coordinar el repositorio, publicar o devolver registros internos directamente.

## Decisión

Se adopta una clase `JurisprudenceApplicationService` con dependencias inyectadas y una fachada `JurisprudenceInternalApi` exclusiva del servidor. La fachada expone métodos explícitos por caso de uso y oculta servicio, repositorio y adaptador mediante campos privados.

Se mantienen excepciones estructuradas como único patrón de fallo porque el repositorio ya usa ese modelo. El detalle público usa un resultado discriminado `found | not_found` porque la ausencia pública no es un error operativo y no debe revelar borradores privados.

## Límites

- Servicio: valida comandos y consultas, coordina repositorio y dominio, proyecta DTO y traduce errores.
- Repositorio: persiste, pagina, controla idempotencia y versión; no publica.
- API interna: delega casos de uso; no contiene SQL ni crea conexiones por operación.
- Factory: construye una única instancia con un repositorio inyectado o con una ruta SQLite explícita.
- Transporte: diferido. No hay HTTP, GraphQL, Route Handlers ni Server Actions.

## Inyección y ciclo de vida

El repositorio, reloj, logger y límite de exploración se inyectan. No hay estado global ni efectos al importar módulos. La factory SQLite rechaza rutas dentro del repositorio Git. `close` cierra una vez y es idempotente; las operaciones posteriores reciben `RESOURCE_CLOSED`.

## DTO y privacidad

Los resúmenes internos son explícitos. El detalle interno es una copia y elimina `officialFile.internalLocation`. Las respuestas públicas son exclusivamente las proyecciones de 11.A y no incluyen `verifiedBy`, notas, contradicciones, borradores generados, historial, claves de idempotencia o correlación.

## Errores

`JurisprudenceApplicationError` traduce códigos seguros del repositorio. Fallos de persistencia se convierten en `REPOSITORY_UNAVAILABLE`; mensajes, SQL, rutas y causas del driver no se exponen. Los errores Zod se convierten en `VALIDATION_ERROR`.

## Idempotencia, versión y publicación

La aplicación exige idempotency key en creación y `expectedVersion` en actualización. El repositorio conserva la semántica transaccional. La aplicación comprueba coherencia básica de `changeKind` y nunca eleva estados automáticamente. Toda evaluación usa los bloqueos puros de 11.A.

## Logging

El puerto mínimo registra requestId, operación, fase, resultado, id y versión opcionales. Prohíbe payload, texto jurídico, datos personales, SQL, rutas, documentos o credenciales. No existe proveedor externo.

## Alternativas consideradas

1. **Importar repositorio desde futuros endpoints:** descartado; acopla transporte, persistencia y publicación.
2. **Servicio de aplicación:** adoptado; concentra orquestación sin invadir dominio.
3. **Server Actions:** descartadas; crearían transporte y acoplamiento con Next.js antes de definir autorización.
4. **API HTTP inmediata:** descartada; ampliaría superficie de red sin política de acceso.
5. **Fachada funcional interna:** considerada; una clase privada alrededor de un servicio facilita ciclo de vida y encapsulación con la convención actual.
6. **Una clase por caso de uso:** diferida; hoy añadiría fragmentación sin una infraestructura de DI que la justifique.

## Seguridad de servidor

No se añade `server-only` porque no está instalado como contrato directo y no se modifican dependencias. La factory importa módulos nativos de Node, los módulos tienen nombres internos y pruebas estáticas prohíben importarlos desde `app`, `components` o `data`. Los barrels generales dejan de reexportar infraestructura.

## Consecuencias

- Consumidores futuros obtienen un contrato único y seguro.
- Memoria y SQLite son intercambiables tras el puerto.
- La búsqueda pública es correcta dentro de un límite conocido y declara parcialidad.
- Aún no existe autorización ni transporte.

## Riesgos

- El control de importaciones es estático, no una política de linter dedicada.
- El recorrido público puede ser costoso con grandes volúmenes.
- SQLite y `node:sqlite` continúan siendo locales/experimentales.
- El contexto aporta trazabilidad, no permisos.

## Decisiones diferidas

HTTP, autenticación, autorización, PostgreSQL, consulta pública optimizada, full-text, rate limiting, anonimización, observabilidad externa e integración UI corresponden a fases posteriores.
