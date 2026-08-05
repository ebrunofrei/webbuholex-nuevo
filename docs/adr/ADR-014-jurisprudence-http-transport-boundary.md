# ADR-014 — Frontera de transporte HTTP jurisprudencial

## Estado

Adoptado en Fase 11.D; contratos no montados.

## Contexto

11.C aprobó una API interna TypeScript exclusiva del servidor. Se requiere preparar transporte verificable sin convertirlo todavía en superficie de red.

## Decisión

Crear controladores sobre Web Standard `Request`/`Response` y una factory de handlers no montados. El controlador adapta método, query, headers y body a comandos/consultas de `JurisprudenceInternalApi`; esta conserva el dominio, publicación, idempotencia, versión y persistencia.

Controlador, handler y ruta son conceptos distintos:

- controlador: aplica el contrato de transporte;
- handler: función `(Request) => Promise<Response>` creada por factory;
- ruta montada: archivo `route.ts` que Next.js expone. No existe en 11.D.

No se usa `NextRequest`/`NextResponse`: no se necesitan cookies, `nextUrl` ni extensiones del framework. Tampoco se crea autenticación ficticia.

## Contratos

Toda respuesta es una unión discriminada `ok: true|false`, incluye requestId y fecha, usa JSON UTF-8 y `Cache-Control: no-store`. Los errores públicos tienen códigos y mensajes controlados. Detalle privado e inexistente convergen en 404 `NOT_FOUND`.

Se aceptan requestId alfanuméricos con guion o guion bajo, hasta 128 caracteres; los inválidos se reemplazan. El actor lo fija la factory y nunca proviene de headers.

Los cuerpos se limitan por `Content-Length` y bytes leídos, con máximo predeterminado de 256 KiB. Las queries tienen claves únicas, lista cerrada y máximo de 2048 caracteres. Crear usa POST e `idempotency-key`; actualizar usa PUT y `expectedVersion` dentro del body. No se adopta `If-Match` en esta fase.

## Errores y logging

Los errores de aplicación se mapean centralmente a 400, 404, 409, 422, 503 o 500. No se filtran mensajes, causas, SQL o rutas. El logger HTTP solo recibe requestId, operación, método, fase, status y código; nunca URL, query, body, headers, cookies o contenido jurídico.

## Lifecycle

La API se inyecta una vez en el controlador. No se abre por operación ni al importar. La factory SQLite exige ruta explícita al ser invocada. `close` delega el cierre idempotente; no se cierra después de cada request.

## Alternativas

1. Endpoints reales: rechazados por ausencia de autorización y política de despliegue.
2. Server Actions: rechazadas; mezclarían UI y transporte.
3. Controladores puros no montados: elegidos por testabilidad y aislamiento.
4. Componentes conectados directamente: rechazados por exposición del servidor.
5. Esperar completamente: descartado porque impediría validar contratos antes de montar.
6. Solo DTO: insuficiente para probar parsing, límites y serialización.

## Consecuencias y riesgos

La futura ruta será delgada y coherente, pero la existencia de handlers no implica seguridad para montarlos. Persisten decisiones sobre autenticación, autorización, CORS, rate limiting, observabilidad, PostgreSQL, despliegue y política de datos personales.
