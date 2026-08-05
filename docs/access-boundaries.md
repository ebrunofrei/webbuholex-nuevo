# Fronteras de acceso de BúhoLex

## Nivel 1 — Público

`loginRequired: false` y `paymentRequired: false`.

Incluye jurisprudencia pública, fuentes oficiales, manuales, legislación, artículos, herramientas públicas, productos y servicios. Estos recursos no deben quedar detrás de autenticación.

## Nivel 2 — Cuenta gratuita futura

`loginRequired: true` y `paymentRequired: false`.

La frontera está modelada, pero no implementada. Comprende búsquedas conservadas, colecciones, favoritos, alertas, historial y una futura prueba limitada del Asistente Legal.

## Nivel 3 — Premium futuro

`loginRequired: true` y `paymentRequired: true`.

La frontera está modelada, pero no implementada. Comprende análisis y comparación jurisprudencial, evaluación de aplicabilidad, documentos, proyectos, automatizaciones, exportaciones, productos adquiridos y servicios contratados.

No existen autenticación, autorización, cuotas o cobros reales en esta fase.

## Separación de rutas de Fase 10.C

- `/espacio` es una presentación pública y explicativa; no es el workspace privado.
- `/iniciar-sesion` es una ruta anónima preparatoria con cabecera mínima.
- `/app` es el inicio del workspace real y requiere `authenticated`.
- El estado vigente es `not_configured`, por lo que `/app` y todas sus subrutas redirigen sin renderizar contenido privado.

Los shells público, anónimo y privado usan configuraciones de navegación independientes. El correo corporativo se obtiene únicamente de `siteConfig.contact.email`.

## Servicios y contacto en Fase 10.D

Las fichas de servicios y los canales corporativos son públicos. Una solicitud de evaluación no crea cuenta, expediente, pago ni almacenamiento. Las capacidades personales y cognitivas avanzadas continúan detrás de la frontera futura de autenticación.
