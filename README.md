# BúhoLex v2

BúhoLex es una plataforma jurídica digital desarrollada por EMCCON. Se organiza en una zona pública orientada a información y un espacio inteligente (Owl/Hermes) que proveerá capacidades analíticas avanzadas.

**Repositorio canónico**: `C:\Projects\Buholex-rev\WebBuholex`
**Rama**: `main`
**HEAD actual**: `ebb9ab762c5553be20aca807a9ba9ff3a245db9c`

## Entorno y Arquitectura Estable

- **Entorno:** Node.js 22+, pnpm 11+, Next.js, PostgreSQL/Supabase, Drizzle ORM, Zod, Vitest.
- **Arquitectura Resumida:** La arquitectura se basa en una separación estricta entre el cliente (interfaz de usuario) y el servidor (lógica de dominio y acceso a datos).
  - **Dominio:** Separación arquitectónica basada en responsabilidades delimitadas (bounded contexts).
  - **Persistencia:** Repositorios y Gateways que conectan con esquemas de bases de datos públicos o internos.
  - **Feature Switches:** Determinadas capacidades sensibles del runtime utilizan configuración explícita y comportamiento fail-closed antes de su activación.
- **Seguridad Básica:**
  - Operación actual sin pagos, checkout, descargas públicas ni autenticación comercial.
  - Principio fundamental: `Untrusted content never becomes system policy`.
  - Controles observados: validación estructural mediante Zod, acceso parametrizado a PostgreSQL mediante Drizzle, escape de renderizado proporcionado por React y separación server-side de secretos/configuración sensible cuando corresponde.

## Estado Técnico Actual
- **Production**: FROZEN. El despliegue aislado no está permitido. El baseline de Production validado anteriormente está bajo la URL `https://webbuholex-nuevo-gdh5a225s-buholex.vercel.app` (Alias: `www.buholex.com`, `buholex.com`). El SHA documentado en auditorías anteriores (`f74ea85c...`) se considera **UNCONFIRMED** al no haber sido validado con metadata de Vercel en este contexto.
- **STAGING**: `CODE_AVAILABLE` y `TESTED`. Las validaciones físicas (`DEPLOYED_TO_STAGING`, `LIVE_HTTP_VERIFIED`, `LIVE_DB_VERIFIED`, `LIVE_AUTH_VERIFIED`, `LIVE_E2E_VERIFIED`) permanecen como **UNKNOWN** (pendientes de verificación manual).

## Carriles Actuales

### 1. Servicios
- **Estado**: CLOSED / CODE READY / NOT YET DEPLOYED.
- La vertical está congelada a nivel de desarrollo y NO debe reabrirse (salvo correcciones funcionales o cambios de contenido autorizados).
- NO se desplegará aisladamente. Forma parte del release conjunto.
- Más detalles en: [docs/services/current-status.md](docs/services/current-status.md)

### 2. Jurisprudencia
- **Estado**: ACTIVE (Carril principal).
- **Estado Físico**: Runtime composition (`createJurisprudencePublicationExecutionRuntime`) materializado, testeado y comiteado (incluyendo pipeline editorial e integración D3-B6).
- **Migraciones de Jurisprudencia**: `0028` a `0032`, físicamente presentes y commiteadas. Su aplicación remota actual en STAGING debe revalidarse durante `STAGING_LIVE_VERIFICATION`.
- Las migraciones `0033` a `0037` pertenecen al dominio Payments y no forman parte del cierre de Jurisprudencia.
- **JURISPRUDENCE_NEXT**: `STAGING_LIVE_VERIFICATION` (Verificar físicamente el pipeline de publicación institucional completo en el entorno de STAGING).
- Más detalles en: [docs/jurisprudence/current-status.md](docs/jurisprudence/current-status.md)

### 3. Payments
- **Estado**: BLOCKED.
- **Bloqueo Externo**: PAY-5D está bloqueado por el ticket de Supabase **SU-475532** (problemas con shared pooler / Supavisor).
- **Importante**: No forma parte del release público conjunto actual. Se mantiene completamente separado de Jurisprudencia y Servicios.

### 4. Páginas Legales
- **Estado**: INVENTARIO PARCIAL RECONCILIADO.
- **Páginas físicamente identificadas en este handoff**:
  - `app/privacidad/page.tsx`
  - `app/terminos/page.tsx`
- **Acción pendiente**: antes del release público conjunto se debe reconciliar la superficie legal completa y actualizar el contenido que corresponda.

## Public Web Release Strategy — September 2026
La estrategia actual prohíbe el despliegue aislado de verticales.
El release público conjunto **solo se realizará** después de:
1. Terminar el cierre técnico de Jurisprudencia.
2. Revisar y actualizar las páginas legales antes del release. Están físicamente identificadas, como mínimo, `app/privacidad/page.tsx` y `app/terminos/page.tsx`; la superficie legal restante deberá reconciliarse antes del release final.
3. Realizar un release conjunto de Servicios + Jurisprudencia + Páginas Legales + Navegación pública.

## Instalación y Ejecución Local
Se requiere **Node.js 22+** y **pnpm 11+**.

```bash
pnpm install
pnpm dev
```

## Comandos de Validación
Existen scripts configurados para asegurar la estabilidad:
```bash
pnpm lint          # Verificación de código estático
pnpm typecheck     # Verificación de tipos TypeScript
pnpm test          # Pruebas unitarias
pnpm build         # Construcción del bundle de producción
```

## Reglas Git / Gravity (Obligatorio)
El agente de IA (Gravity):
- Implementa, prueba, corrige y reporta.
- **Deja los cambios en el working tree** para revisión humana.
- **NO ejecuta** `git add`, `git commit`, `git push`.
- **NO ejecuta** mutaciones en bases de datos de STAGING/PRODUCTION, ni en Vercel, ni Auth0, ni Culqi.

El flujo humano posterior obligatorio es:
1. Revisión de reporte.
2. `git status`
3. `git diff`
4. Staging selectivo.
5. `git diff --cached`
6. `commit manual`
**NUNCA USAR `git add .`**

## Documentación Técnica (Fuentes de Verdad)
Toda la documentación técnica se encuentra en la carpeta `docs/`:

- Estado detallado Servicios: [docs/services/current-status.md](docs/services/current-status.md)
- Estado detallado Jurisprudencia: [docs/jurisprudence/current-status.md](docs/jurisprudence/current-status.md)
- Resumen del Sistema: [docs/architecture/system-overview.md](docs/architecture/system-overview.md)
- Arquitectura Jurisprudencia: [docs/architecture/jurisprudence-architecture.md](docs/architecture/jurisprudence-architecture.md)
- Arquitectura Owl & Hermes: [docs/architecture/owl-hermes-architecture.md](docs/architecture/owl-hermes-architecture.md)
- Security Boundaries: [docs/architecture/security-boundaries.md](docs/architecture/security-boundaries.md)
- Official Ingestion: [docs/jurisprudence/official-ingestion.md](docs/jurisprudence/official-ingestion.md)
- Publication Pipeline: [docs/jurisprudence/publication-pipeline.md](docs/jurisprudence/publication-pipeline.md)
- Roadmap Técnico: [docs/roadmap/technical-roadmap.md](docs/roadmap/technical-roadmap.md)
