# BúhoLex v2

BúhoLex es una plataforma jurídica digital desarrollada por EMCCON. Se organiza en una zona pública orientada a información y un espacio inteligente (Owl/Hermes) que proveerá capacidades analíticas avanzadas.

## Estado Técnico Actual
- **Despliegue (Production):** Frozen (sin despliegue activo, trabajo en entorno local/STAGING).
- **Indexación:** noIndex configurado (default-deny para buscadores).
- **Entorno:** Node.js 22, pnpm 11, Next.js, PostgreSQL/Supabase, Drizzle ORM, Zod, Vitest.

## Arquitectura Resumida
La arquitectura se basa en una separación estricta entre el cliente (interfaz de usuario) y el servidor (lógica de dominio y acceso a datos).
- **Dominio:** Separación arquitectónica basada en responsabilidades delimitadas (bounded contexts).
- **Persistencia:** Repositorios y Gateways que conectan con esquemas de bases de datos públicos o internos.
- **Feature Switches:** Determinadas capacidades sensibles del runtime utilizan configuración explícita y comportamiento fail-closed antes de su activación.

Para un detalle exhaustivo, revisar la [Documentación Técnica](#documentación-técnica).

## Módulos Principales
- **Zona Pública:** Inicio, Institución, Servicios, Consulta Profesional, Plantillas, Explorar.
- **Jurisprudencia:** Núcleo de datos legales con ingestion pipeline y public projection.
- **Asistente (Owl):** Interfaz para capacidades inteligentes, actualmente estructural.

### Estado de Jurisprudencia
- **Interfaz Pública:** Implementada y probada; su disponibilidad efectiva depende de la activación controlada del runtime. Jurisprudencia permanece sin activación en Production.
- **Gateway de Búsqueda Pública:** Implemented y tested, integrado a nivel de código.
- **Ingestión Oficial:** Soporta preview y canonical validation.
- **Publicación:** Protegida mediante Outbox y Processor para aislar registros internos de la vista pública. No activada públicamente.

### Estado de Owl
- Interfaz (Owl) implementada.
- **real LLM provider:** NOT_IMPLEMENTED
- **RAG:** NOT_IMPLEMENTED
- Flujo actual restringido a validación estructural (simulación de orquestación).

## Seguridad Básica
- Operación actual sin pagos, checkout, descargas públicas ni autenticación comercial.
- Principio fundamental: `Untrusted content never becomes system policy`.
- Controles observados en la superficie auditada: validación estructural mediante Zod, acceso parametrizado a PostgreSQL mediante Drizzle, escape de renderizado proporcionado por React y separación server-side de secretos/configuración sensible cuando corresponde.

## Instalación y Ejecución Local
Se requiere **Node.js 22+** y **pnpm 11+**.

```bash
pnpm install
pnpm dev
```

### Comandos de Testing y Verificación
Existen scripts configurados para asegurar la estabilidad:
```bash
pnpm lint          # Verificación de código estático
pnpm typecheck     # Verificación de tipos TypeScript
pnpm test          # Pruebas unitarias
pnpm build         # Construcción del bundle de producción
```

## Roadmap Inmediato
Ambos carriles evolucionan en paralelo. Owl/Hermes no bloquea Jurisprudencia ni el release general de BúhoLex.

### Carril A — Jurisprudencia
- **NEXT:** J2-A.3 — Persistencia física controlada de los tres registros oficiales piloto en STAGING.

### Carril B — Owl/Hermes
- **NEXT:** HERMES-A1 — Trust Boundary + Prompt/Output Contracts

## Documentación Técnica

Toda la documentación arquitectónica detallada y las decisiones tomadas se encuentran en el directorio `docs/`:

### Arquitectura
- [System Overview](docs/architecture/system-overview.md)
- [Jurisprudence Architecture](docs/architecture/jurisprudence-architecture.md)
- [Owl & Hermes Architecture](docs/architecture/owl-hermes-architecture.md)
- [Security Boundaries](docs/architecture/security-boundaries.md)

### Jurisprudencia
- [Official Ingestion](docs/jurisprudence/official-ingestion.md)
- [Publication Pipeline](docs/jurisprudence/publication-pipeline.md)

### Decisiones Arquitectónicas (ADRs)
- [ADR-001: Jurisprudence Public Boundary](docs/decisions/ADR-001-jurisprudence-public-boundary.md)
- [ADR-002: Resolution Number Nullable](docs/decisions/ADR-002-resolution-number-nullable.md)
- [ADR-003: Preview Persistibility](docs/decisions/ADR-003-preview-persistibility.md)
- [ADR-004: Owl / Hermes Boundary](docs/decisions/ADR-004-owl-hermes-boundary.md)

### Roadmap
- [Technical Roadmap](docs/roadmap/technical-roadmap.md)
