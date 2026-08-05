# ADR-018 — Ingesta jurisprudencial con preview y confirmación

- Estado: aprobado — pipeline de ingesta interna validado; sin fuentes reales, endpoints ni publicación automática.
- Fecha: 2026-07-29

## Contexto

11.A–11.C ya separan dominio, publicación, aplicación y persistencia. Incorporar fuentes directamente al repositorio permitiría omitir validación, trazabilidad, preview, idempotencia y control de versión.

## Decisión

Se adopta un pipeline interno inyectable que acepta exclusivamente entradas locales estructuradas, valida con Zod estricto, normaliza determinísticamente, mantiene checksum, fingerprint e identidad como conceptos separados y obliga a ejecutar preview antes de confirmar.

La confirmación persiste solo mediante `JurisprudenceInternalApi`. El pipeline no importa adaptadores concretos ni SQL. La idempotencia del repositorio permanece como última garantía y el pipeline agrega idempotencia de lote/preview durante su ciclo de vida.

## Preview y concurrencia

El preview es efímero y no escribe. La confirmación compara fingerprint, idempotency key, TTL y, para actualización, `expectedVersion`. Un preview expirado o alterado falla; una versión concurrente no se sobrescribe.

## Normalización e identidad

Solo se normalizan metadatos permitidos. El contenido jurídico significativo conserva redacción y orden. El checksum prueba igualdad del material fuente; el fingerprint representa el registro normalizado; la identidad jurídica usa la clave explicable de 11.B. Ninguno reemplaza a los demás.

## Privacidad y logging

Una barrera básica rechaza campos personales, secretos, SQL y rutas en fixtures. No es anonimización. El logger solo recibe referencias operativas mínimas y nunca raw records, textos, checksums completos o detalles de infraestructura.

## Alternativas descartadas

- Persistir al parsear: impide revisión y consume idempotencia.
- Importar repositorios en el pipeline: rompe la frontera de aplicación.
- Resolver colisiones por similitud: jurídicamente inexplicable.
- Usar checksum como identidad: confunde procedencia con resolución.
- Crear endpoint o UI: no hay autenticación real ni autorización de montaje.

## Consecuencias y limitaciones

Memoria y SQLite pueden probar el mismo flujo por la API interna. Los previews residen en memoria del proceso y no son adecuados para producción distribuida. No existe adquisición real, archivos, scraping, OCR, IA, malware scanning, anonimización, autenticación de operador ni workflow de publicación.

`productionIngestionReady`, `automatedPublicationReady`, `endpointsMounted` y `uiConnected` permanecen en falso. No se incorporan datos reales ni se modifica `/jurisprudencia`.

## Validación oficial

La copia externa sincronizada y materialmente equivalente aprobó `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`, todos con código 0:

- 39 archivos de prueba aprobados.
- 501 pruebas aprobadas.
- 35 pruebas específicas de 11.G.
- 46 de 46 páginas generadas.

SQLite continúa siendo local y experimental. Las advertencias de SQLite, jsdom canvas y `act(...)` no bloquearon la ejecución. Esta aprobación valida el pipeline interno y sus adaptadores de prueba; no acredita adquisición productiva de fuentes, tratamiento de datos reales, autenticación, endpoints ni publicación automática.
