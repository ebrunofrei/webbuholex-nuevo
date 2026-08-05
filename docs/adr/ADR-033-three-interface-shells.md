# ADR 033: Tres Shells de Interfaz (Gateway, Público e Inteligente)

**Estado**: Aceptado
**Fecha**: 2026-07-30
**Contexto**: BúhoLex requiere distinguir claramente la experiencia del visitante de la portada inicial (Gateway), la navegación de información pública, y el futuro espacio inteligente del Asistente Jurídico, sin llegar a depender de componentes como LitisBot o mezclar los encabezados en zonas conceptualmente distintas.

## Problema

Actualmente, el enrutador visual de la plataforma (`SiteFrame`) utilizaba una variable (`hasPublicShell`) que, por descarte, aplicaba la cabecera y el footer institucional (público) a cualquier ruta nueva no autenticada, incluyendo `/asistente`. Adicionalmente, el Home (Gateway) operaba con un diseño basado en tarjetas (`cards`) flotantes que provocaba la impresión de estar visualizando dos productos separados, en lugar de un único ecosistema BúhoLex.

## Alternativas Consideradas

1.  **Next.js Route Groups (`app/(public)`, `app/(gateway)`, `app/(intelligent)`)**:
    *   **Pros**: Representan la manera nativa y canónica en App Router para definir layouts únicos.
    *   **Contras**: Implementar esto en la fase actual requeriría migrar los archivos físicos, lo cual rompería múltiples referencias relativas, rompería casi todos los tests end-to-end y unitarios (que importan directamente las páginas por sus rutas estáticas actuales), y obligaría a duplicar gran parte del código de `SiteFrame`.

2.  **Manejo condicional estricto en `SiteFrame` (Seleccionado)**:
    *   **Pros**: `SiteFrame` ya opera exitosamente como el director visual global. Agregar una condición estricta `isIntelligentPreview` y acoplarla al renderizado permite mantener las rutas físicas intactas. El riesgo de regresiones sobre la plataforma actual es casi nulo.
    *   **Contras**: Concentra más lógica de presentación condicional en un solo archivo, lo que a futuro (si hubiera decenas de shells) podría ser insostenible, aunque actualmente son exactamente cuatro (Auth, Público, Workspace, Inteligente, más el Gateway implícito).

## Decisión

Aprobamos la **Alternativa 2**. Se mantiene `SiteFrame` como orquestador, extendiendo sus validaciones lógicas para inyectar explícitamente `IntelligentPreviewHeader` en `/asistente`. En paralelo, el Home (Gateway) es rediseñado a nivel de estilos para fusionar las áreas públicas e inteligentes en una escena única y unificada (sin uso de `cards`), mientras continúa suprimiendo el renderizado de la navegación pública y footer gracias a su condición `isPortal`.

## Consecuencias

*   **Rutas estables**: Toda prueba en `tests/` que verifique componentes de ruta de manera relativa seguirá funcionando (previas adaptaciones de las expectativas HTML).
*   **Aislamiento del Workspace**: El ecosistema interno de `app/app/*` queda 100% preservado sin tocar su middleware ni layouts.
*   **Separación de Marca**: BúhoLex posee ahora la capacidad de iniciar pruebas sobre su propio asistente utilizando la estética profunda sin que el usuario confunda este shell con el catálogo de servicios públicos, o con "LitisBot".
