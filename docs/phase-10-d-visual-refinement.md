# Fase 10.D — Refinamiento visual y servicios

## Implementado

- hero dual con dos accesos y respuesta coordinada a foco y puntero;
- integración transparente del búho institucional en halo circular;
- entrada y flotación CSS compatibles con movimiento reducido;
- directorio `/explorar` compacto con estados coherentes;
- lenguaje público depurado en `PageHero` y jurisprudencia;
- límite real de 3000 caracteres en la demostración del Asistente;
- catálogo tipado de siete servicios;
- fichas dinámicas `/servicios/[slug]`;
- ingeniería civil para saneamiento inmobiliario con advertencia de viabilidad;
- reconocimiento local de `service` en Consulta profesional;
- correo y WhatsApp Business centralizados;
- footer y panel institucional actualizados sin datos bancarios.

## Restricciones preservadas

No existen autenticación real, agenda, pagos, compra, descargas, QR, backend de solicitudes, almacenamiento, OpenAI, scraping ni publicación. BL-LEG-CON-001 permanece en vista previa editorial con precio y moneda nulos, licencia pendiente y autorización de publicación falsa.

## Validación

### Comandos oficiales

Los cuatro comandos fueron ejecutados en el orden solicitado, pero sus herramientas no llegaron a iniciar:

1. `pnpm lint`: `EPERM` al abrir `node_modules/eslint/bin/eslint.js`.
2. `pnpm typecheck`: `EPERM` al abrir `node_modules/typescript/bin/tsc`.
3. `pnpm test`: `EPERM` al abrir `node_modules/vitest/vitest.mjs`.
4. `pnpm build`: `EPERM` al abrir `node_modules/next/dist/bin/next`.

`pnpm dev --port 3000` recibió el mismo `EPERM` sobre Next.js. No se modificaron permisos, dependencias, `package.json` o lockfile. Un intento de copiar temporalmente TypeScript también fue rechazado por permisos y no produjo una validación.

### Comprobaciones alternativas

- 150 archivos TypeScript/TSX inspeccionados y sus imports internos resueltos;
- 10 hojas CSS con llaves balanceadas;
- cero `any` explícitos en los archivos nuevos de la fase;
- cero entradas Vite o `react-router-dom`;
- correo y WhatsApp presentes únicamente en la configuración central;
- cero QR, datos bancarios, Calendly o Messenger en las superficies revisadas;
- siete servicios tipados y servicio de ingeniería presente;
- estado comercial de BL-LEG-CON-001 preservado.

### Auditoría visual real

Una instancia local ya activa respondió en `http://localhost:3000` y reflejó los cambios mediante recarga de desarrollo. Se revisaron el portal, `/explorar`, `/espacio`, `/iniciar-sesion`, `/asistente`, `/jurisprudencia`, `/plantillas`, `/servicios`, la ficha de ingeniería, `/contacto` y la consulta contextual.

En 1280 × 720 el portal muestra títulos completos, dos CTA, búho centrado, halo sin marco rectangular y control legal dentro del viewport. Los estados de foco son visibles. Se corrigió durante la auditoría el salto poco elegante del correo en Contacto. Las capturas de páginas largas conservaron todo el contenido; el encabezado fijo puede repetirse durante el cosido automático de la imagen.

El navegador disponible no permitió cambiar el viewport. No se generó una captura móvil falsa. El CSS contiene reglas específicas para 800, 760 y 560 px, sin posiciones absolutas para los textos móviles, pero esto se registra solo como comprobación estática, no como auditoría móvil real. La herramienta tampoco expuso lectura o captura de consola; los snapshots no mostraron páginas de error, pero no se declara consola limpia.

### Capturas verificadas

- `01-portal-dual.jpg`
- `02-portal-foco-publico.jpg`
- `03-portal-foco-inteligente.jpg`
- `04-buho-halo-detalle.jpg`
- `07-explorar.jpg`
- `08-servicios.jpg`
- `09-ingenieria.jpg`
- `10-contacto.jpg`
- `11-panel-legal.jpg`
- `12-asistente.jpg`
- `13-jurisprudencia.jpg`

## Archivos creados

- `types/services.ts`
- `lib/schemas/services.ts`
- `data/services.ts`
- `lib/contact-links.ts`
- `components/public/public-patterns.tsx`
- `components/public/public-patterns.module.css`
- `components/services/service-catalog.tsx`
- `components/services/service-detail.tsx`
- `components/services/services.module.css`
- `app/servicios/[slug]/page.tsx`
- `tests/services-catalog.test.tsx`
- `tests/phase-10-d-visual.test.ts`
- `docs/phase-10-d-visual-refinement.md`
- `docs/portal-hero-art-direction.md`
- `docs/public-page-visual-system.md`
- `docs/services-catalog-architecture.md`
- `docs/institutional-contact-channels.md`

## Archivos modificados

- `README.md`
- `app/layout.tsx`
- `app/globals.css`
- `app/explorar/page.tsx`
- `app/servicios/page.tsx`
- `app/contacto/page.tsx`
- `app/consulta-profesional/page.tsx`
- `app/sitemap.ts`
- `components/portal/dual-portal.tsx`
- `components/portal/dual-portal.module.css`
- `components/portal/legal-transparency-panel.tsx`
- `components/explore/public-explore.tsx`
- `components/assistant-interface.tsx`
- `components/page-hero.tsx`
- `components/professional-consultation-form.tsx`
- `components/site-footer.tsx`
- `components/jurisprudence/jurisprudence-public-page.tsx`
- `components/jurisprudence/jurisprudence.module.css`
- `lib/site-config.ts`
- `tests/portal-routes.test.tsx`
- `tests/consultation-form.test.tsx`
- `tests/corporate-contact.test.ts`
- `docs/public-private-product-architecture.md`
- `docs/access-boundaries.md`
- `docs/phase-10-c-access-separation.md`
