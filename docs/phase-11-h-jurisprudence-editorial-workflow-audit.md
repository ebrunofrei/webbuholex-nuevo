# Auditoría del workflow editorial jurisprudencial — Fase 11.H

## Alcance revisado

Se revisaron el registro canónico y los bloqueos de publicación de 11.A; identidad, versión e historial de 11.B; `JurisprudenceInternalApi`, DTO y evaluación de publicación de 11.C; las fronteras HTTP y guards no montados de 11.D–11.E; la decisión de autenticación `defer` de 11.F; y el pipeline privado aprobado de 11.G. También se inspeccionaron manifiestos, configuración, middleware, `app`, `components`, `data`, `public`, `lib`, `types`, pruebas y ADR previos.

## Capacidades encontradas

- `JurisprudenceInternalApi` permite recuperar un registro por id, consultar su versión e invocar la evaluación pura de publicación.
- El repositorio jurisprudencial ya aporta versión optimista e historial del registro, pero no almacena expedientes editoriales.
- Los permisos de 11.E distinguen actualización editorial, de fuente, evaluación e historial; no hay identidad real que los haga operativos por red.
- Memoria y `node:sqlite` constituyen patrones locales probados, sin conexión global ni efectos al importar.
- No existen `app/api`, `route.ts`, endpoints, UI editorial ni conexión de `/jurisprudencia`.

## Capacidades ausentes antes de 11.H

No existían expediente editorial, asignaciones, observaciones estructuradas, separación de decisiones, historial editorial, invalidación por versión o readiness editorial. Tampoco existen autenticación real, usuario persistido, política productiva de fuentes o autorización de publicación.

## Riesgos identificados

1. Confundir ingesta válida con revisión o verificación.
2. Convertir una evaluación técnica favorable en autorización o publicación.
3. Reutilizar aprobaciones después de cambiar el registro.
4. Permitir que un único actor desempeñe revisión editorial y jurídica.
5. Almacenar el workflow en campos arbitrarios del registro canónico.
6. Filtrar observaciones, actores o errores de SQLite en logs.
7. Perder historial al resolver observaciones o reemplazar decisiones.
8. Montar rutas antes de contar con autenticación real.

## Frontera adoptada

```text
consumidor interno
  → JurisprudenceEditorialWorkflow
  → JurisprudenceInternalApi
  → dominio y publicación 11.A
  → repositorio jurisprudencial

JurisprudenceEditorialWorkflow
  → JurisprudenceEditorialCaseRepository
  → memoria o SQLite local de pruebas
```

El workflow no importa adaptadores jurisprudenciales, SQL, React, rutas o módulos de `app`. Las decisiones se conservan en un expediente separado y no cambian `publicationStatus`.

## Decisiones pendientes

Autenticación del operador, gobierno de fuentes, retención de auditoría, privacidad y anonimización, almacenamiento productivo, autorización de publicación, rutas, UI y despliegue permanecen diferidos.

## Cierre oficial

La auditoría y la arquitectura resultante quedaron aprobadas tras la validación externa física y equivalente de 11.H: 18/18 archivos obligatorios y hashes coincidentes, 40 archivos de prueba, 533 pruebas, 32 pruebas específicas y 46/46 páginas. Este cierre no altera las capacidades ausentes ni autoriza rutas, UI o publicación.
