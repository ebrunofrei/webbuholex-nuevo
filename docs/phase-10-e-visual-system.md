# Fase 10.E — Sistema visual institucional

Fecha de cierre local: 2026-07-28.

## Alcance

Esta fase normaliza la presentación de BúhoLex sin modificar su arquitectura funcional. Se conservan el portal dual, la separación pública/privada, el guard de `/app`, el catálogo real, la ficha de `BL-LEG-CON-001`, los servicios, la arquitectura de jurisprudencia y todas las restricciones comerciales.

## Sistema cromático

La paleta se centraliza en `app/globals.css` mediante los tokens `--bl-*`:

- público: blanco `#ffffff`, tinta `#102a2e`, rojo `#b83a24` y marrón `#5a321d`;
- espacio inteligente: azul `#0757c8`, azul profundo `#063b83` y azul interactivo `#2f80ed`;
- superficies secundarias: `#f7f4ef` y borde `#e8e8e8`;
- estados: éxito `#16835f`, advertencia `#b7791f` y error `#b42318`.

Los nombres heredados se mantienen únicamente como alias de compatibilidad. No constituyen una segunda paleta.

## Criterios aplicados

- Fondo blanco predominante en las páginas públicas.
- Rojo institucional para acciones, navegación activa y foco público.
- Azul exclusivamente para el Espacio Virtual Inteligente y capacidades avanzadas.
- Verde limitado a estados disponibles, verificados o correctos.
- Footer público blanco con separación roja y menor densidad.
- Panel legal blanco, jerarquizado y accesible.
- Tipografía editorial en títulos y sans serif en controles.
- Foco global de dos píxeles, con rojo público y azul privado.
- Animación del búho limitada a transformaciones discretas y desactivable mediante `prefers-reduced-motion`.

## Componentes normalizados

- Portal dual: fondo blanco/azul, halo reactivo, foco diferenciado y división sin verde.
- `PublicHeader`: superficie blanca, navegación activa roja y CTA rojo.
- `AuthHeader`: cabecera mínima con acento azul.
- Footer: superficie blanca, enlaces marrones/rojos y datos institucionales autorizados.
- Directorio `/explorar`: hero breve blanco y estados semánticos calculados.
- Jurisprudencia: búsqueda pública roja y módulos inteligentes azules.
- Servicios: hero blanco, tarjetas claras, badges semánticos y resumen secundario marrón.
- Plantillas: hero blanco, mascota sin marco, controles compactos y superficie principal blanca.
- Asistente: orientación pública roja/blanca, demostración ámbar y capacidades avanzadas azules.
- Contacto: ancho suficiente y `overflow-wrap: anywhere` como salvaguarda del correo.

## Accesibilidad y responsive

Se preservan la estructura de encabezados, etiquetas, `aria-expanded`, controles reales, diálogo modal, cierre con Escape, ciclo de foco, retorno del foco y navegación por teclado. El portal conserva un único contorno perceptible tras eliminar el segundo marco que duplicaba el foco.

La inspección real se realizó en la ventana disponible de 1280 × 720. El entorno de navegador integrado no expuso control de viewport; por ello 1440 × 900, 1024 × 768, 768 × 1024, 390 × 844 y 360 × 800 se comprobaron solo mediante reglas responsive existentes y revisión estática. No se declara auditoría visual real en esas dimensiones.

## Validación

Los comandos oficiales se ejecutaron en el orden indicado, pero quedaron bloqueados antes de cargar el proyecto:

| Comando | Resultado |
| --- | --- |
| `pnpm lint` | EPERM al abrir `node_modules/eslint/bin/eslint.js` |
| `pnpm typecheck` | EPERM al abrir `node_modules/typescript/bin/tsc` |
| `pnpm test` | EPERM al abrir `node_modules/vitest/vitest.mjs` |
| `pnpm build` | EPERM al abrir `node_modules/next/dist/bin/next` |
| `pnpm dev --port 3000` | EPERM al abrir `node_modules/next/dist/bin/next` |

No se cambiaron permisos, dependencias, `package.json` ni lockfile. Una instancia local ya disponible permitió la revisión visual.

Comprobaciones alternativas realizadas:

- 10 archivos CSS revisados y cero llaves desbalanceadas;
- cero `any` explícitos en los archivos de la fase;
- cero directivas Tailwind heredadas;
- rutas mínimas presentes;
- cero atributos `download`;
- cero archivos de producto en `public/`;
- cero coincidencias de verde dominante heredado en los módulos públicos normalizados;
- un único `h1` y ausencia de rutas privadas/hashes en las 11 rutas inspeccionadas;
- producto real preservado con `published: false`, `visibility: editorial_preview`, precio y moneda nulos, licencia pendiente y autorización de publicación desactivada en el modelo editorial.

## Limitaciones

- Los comandos oficiales no validaron el código por el bloqueo EPERM.
- La herramienta visual no permitió cambiar el viewport ni extraer el registro completo de consola. No apareció overlay de error ni alerta con contenido durante la navegación.
- No se modificaron los documentos, hashes ni rutas privadas del producto.

## Estado final

No publicado, no desplegado, sin autenticación real, pagos, compra, descargas, servicios externos, scraping, analítica externa ni datos bancarios.
