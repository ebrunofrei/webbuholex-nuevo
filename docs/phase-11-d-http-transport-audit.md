# Auditoría del transporte jurisprudencial — Fase 11.D

## Alcance revisado

Se revisaron `app/`, `middleware.ts`, `next.config.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts`, los esquemas y tipos jurisprudenciales, `JurisprudenceInternalApi`, su servicio y factories, los adaptadores de memoria y SQLite, las pruebas de 11.A–11.C y los barrels `types/domain.ts` y `lib/schemas.ts`.

## Arquitectura encontrada

- Next.js 15.5.9 con App Router, Node 22 y TypeScript estricto.
- `middleware.ts` usa `NextRequest`/`NextResponse` únicamente para proteger `/app`.
- No existe `app/api`, ningún `route.ts` ni Server Action.
- La interfaz `/jurisprudencia` es demostrativa y no usa `fetch` ni la API interna.
- La aplicación usa Zod estricto y errores de aplicación estructurados.
- `JurisprudenceInternalApi` encapsula servicio, dominio y repositorio; las factories controlan memoria y SQLite.
- No existían envelope HTTP, política uniforme de serialización, parser estricto de query/body, límite de body, mapeo HTTP, logger HTTP ni política CORS.

## Riesgos identificados

Montar rutas antes de autenticación y autorización expondría operaciones editoriales. También existía riesgo de filtrar mensajes del driver, DTO internos, notas o ubicación de archivos; aceptar queries repetidas o desconocidas; confiar en `Content-Length`; registrar URL/body; abrir SQLite durante importación; o revelar que un registro privado existe.

## Decisión

Se adopta una frontera basada en Web Standard `Request`/`Response`, sin dependencia de Next.js y sin ruta física. Los controladores reciben una `JurisprudenceInternalApi` inyectada. La factory devuelve funciones conceptualmente compatibles con futuros Route Handlers, pero no las monta.

No se usa `NextRequest`/`NextResponse` porque las capacidades específicas de Next.js no son necesarias para validar métodos, URL, headers, JSON ni generar `Response`.

## Elementos reutilizados

- esquemas Zod del dominio, repositorio y aplicación;
- `JurisprudenceSearchInput` y proyecciones públicas;
- errores seguros de aplicación;
- contexto con requestId y actor opaco;
- API interna y factories de memoria/SQLite;
- cierre idempotente y reglas de publicación.

## Ubicación adoptada

- `types/jurisprudence-http.ts`;
- `lib/schemas/jurisprudence-http.ts`;
- `lib/jurisprudence-http-*.ts`;
- `lib/jurisprudence-route-handler-factory.ts`.

No se reexportan desde barrels generales y no se importan desde `app`, `components` o `data`.

## Límites y condiciones futuras

11.D no ofrece red. Para montar rutas posteriormente deberán definirse autenticación, autorización editorial, política CORS, lifecycle por proceso, configuración segura de persistencia, límites de infraestructura, observabilidad aprobada, política de datos personales y pruebas del despliegue. Hasta entonces, la obscuridad, localhost, robots o headers inventados no constituyen controles válidos.
