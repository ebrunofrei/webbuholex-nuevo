# Accesibilidad y Semántica del Detalle Jurisprudencial (Fase 11.O)

## Estructura Semántica WCAG
* `<main>` único por documento renderizado.
* `<h1>` único por documento renderizado (título dinámico de la resolución en `success`, o título del detalle en otros estados).
* Región en vivo accesible: `aria-live="polite"` y `aria-busy` para notificación de cambios de estado.
* Enlace de retorno accesible con `aria-label` descriptivo.
* Enfoque visible y responsive layout sin desbordamiento horizontal.
