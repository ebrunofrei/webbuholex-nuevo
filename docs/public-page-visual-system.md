# Sistema visual de páginas públicas

## Tokens

Los tokens globales permanecen en `app/globals.css`: verde petróleo, terracota, crema, dorado, blanco cálido, neutros, foco y escalas tipográficas. Los estilos propios del portal, exploración, jurisprudencia y servicios viven en CSS Modules.

## Patrones reutilizados

- `PageHero`: entrada editorial de páginas existentes.
- `SectionIntro`: encabezado contenido para secciones.
- `StatusBadge`: disponibilidad pública breve.
- `ActionLink`: enlace de acción con foco y área táctil suficiente.
- `InstitutionalNotice`: limitaciones o advertencias institucionales.

Los patrones se aplican donde existe uso real. No se creó una biblioteca genérica paralela.

## Escala vertical

- compacta: 24–40 px;
- media: 48–72 px;
- amplia: 72–108 px;
- hero: 62–104 px, según viewport.

Las páginas evitan repetir tarjetas idénticas, reducen titulares extremos y alternan fondos con una función de orientación clara.
