# Estructura de URLs y Navegación de Detalle Jurisprudencial (Fase 11.O)

## 1. Patrón de URL
* `/jurisprudencia/[slug]`

## 2. Conservación de Parámetros de Búsqueda
Al navegar hacia `/jurisprudencia/[slug]` o regresar mediante el enlace de retorno:
* Se parsean los parámetros con `parseJurisprudencePublicSearchParameters`.
* Se filtran y descartan parámetros administrativos, no reconocidos o de bypass (ej. `adminBypass`, `token`, `secretToken`).
* Se serializan únicamente los parámetros públicos válidos (`q`, `institution`, `body`, `matter`, `type`, `case`, `resolution`, `from`, `to`, `sort`, `page`).
