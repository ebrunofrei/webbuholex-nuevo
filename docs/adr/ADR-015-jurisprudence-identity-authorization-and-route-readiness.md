# ADR-015 — Identidad, autorización y preparación de rutas jurisprudenciales

- Estado: aprobado. Política y handlers protegidos validados; autenticación real ausente y rutas no montadas.
- Fecha: 2026-07-29

## Contexto

11.D creó controladores y handlers HTTP no montados. Su validación de transporte no proporciona identidad ni autorización. El proyecto no tiene proveedor real, usuarios, sesiones ni credenciales, por lo que montar operaciones internas sería inseguro y describir el login preparatorio como autenticación sería incorrecto.

## Decisión

Adoptar una frontera explícita anterior a los handlers:

`autenticador inyectado → principal → política pura → guard → handler no montado`.

El principal es mínimo, opaco y sin datos personales. Los roles son agrupadores cerrados; la autorización final usa una matriz literal de permisos por operación. Rige `default deny`, sin wildcard ni rol capaz de eludir la política.

La lectura anónima se limita a `search_public` y `get_public_detail`. Las operaciones internas requieren principal válido, nivel distinto de anónimo y permiso explícito. Autenticación y publicación son controles independientes.

## Principal y autenticación

`JurisprudencePrincipal` diferencia `anonymous`, `service` y `human`; utiliza subjectId opaco, roles enumerados, nivel, emisión, expiración opcional y proveedor controlado. No admite correo, DNI, nombre, teléfono, IP ni cabeceras como fuente de identidad.

`JurisprudenceAuthenticationResult` diferencia identidad autenticada, anónima, rechazada y autenticador no disponible. El puerto `JurisprudenceAuthenticator` solo resuelve identidad. Esta fase aporta únicamente un autenticador anónimo. El autenticador de prueba está confinado a helpers de tests.

## Autorización

La política es pura, versionada e inyectable. Verifica esquema, expiración, habilitación explícita de `test_only`, operación y permiso. La decisión interna contiene el permiso requerido para aplicar la política, pero ni ese permiso ni sus internals se devuelven en el envelope.

Los permisos de publicación y despublicación quedan reservados en la matriz; no crean casos de uso inexistentes.

## Guard y `update_record`

El guard autentica y autoriza antes de invocar handlers. Para actualización se eligió clonar `Request`: tras autenticar, la copia se valida con `jurisprudenceHttpUpdateBodySchema` y el límite de 256 KiB para refinar la operación a `update_editorial` o `update_source`. El body original no se consume.

Las denegaciones usan 401, 403 o 503, `Cache-Control: no-store`, JSON estable y requestId. No se añade `WWW-Authenticate` hasta definir un esquema real. El logging se limita a requestId, operación, principalKind, resultCode, policyVersion y status; no contiene subjectId, roles, permisos, body, URL, query, headers, tokens ni contenido jurídico.

## Ciclo de vida

La factory recibe handlers y autenticador; no abre SQLite ni crea rutas. `closeService` requiere permiso específico. `dispose()` pertenece al propietario de la factory, es idempotente y permite limpiar recursos aunque el proveedor de identidad no esté disponible.

## Política de montaje

`evaluateJurisprudenceRouteMountReadiness` separa contratos implementados de preparación operativa y no admite override. Ninguna ruta está lista: faltan proveedor real para las internas y, según el alcance, sesiones, secretos, privacidad, CORS, rate limiting, persistencia productiva, lifecycle, disponibilidad, auditoría durable, ownership, entorno y respuesta a incidentes.

## Alternativas consideradas

1. Montar y proteger después: rechazada por exposición inmediata.
2. Confiar en middleware de `/app`: rechazado; solo redirige cuando la sesión está no configurada.
3. Identidad mediante headers internos: rechazada por suplantación.
4. Motor previo al montaje: adoptado.
5. Proveedor real ahora: diferido por alcance y falta de decisión.
6. Solo contratos/readiness: insuficiente; se añadió guard ejecutable y testeable, todavía no montado.

## Consecuencias y riesgos

- La separación reduce privilegios accidentales y hace auditable cada operación.
- La política no sustituye revocación, sesiones, CSRF, rate limiting ni auditoría persistente.
- El actor técnico que 11.D entrega a la aplicación sigue siendo opaco; una fase futura deberá propagar identidad autorizada sin exponerla públicamente.
- Un guard correcto no autoriza por sí mismo crear URLs.

## Decisiones diferidas

Proveedor, asignación de roles, persistencia de identidad, sesión, MFA, revocación, CSRF, CORS, rate limiting, auditoría durable, propagación del principal a la aplicación y política definitiva de montaje.
