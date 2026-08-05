# Fase 11.N — URL y validación pública

La consulta usa un esquema Zod estricto y una serialización determinista con el orden: `q`, `institution`, `body`, `matter`, `type`, `case`, `resolution`, `from`, `to`, `sort`, `page`.

Los opcionales se reconstruyen mediante inclusión condicional: cuando faltan, sus claves se omiten materialmente y nunca se materializan con `undefined`. Se validan longitudes, fechas, rango, orden, página y tamaño.

No se admiten JSON arbitrario, SQL, IDs administrativos ni flags `bypass`, `force`, `publish`, `expose`, `admin`, `internal`, `raw` o `includePrivate`. Los parámetros vacíos se omiten. La URL no crea analytics ni historial institucional; solo representa el estado público de la consulta.
