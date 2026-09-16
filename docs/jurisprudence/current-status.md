# Estado Actual de Jurisprudencia (Handoff)

## 1. Reconciliación del Runtime de Jurisprudencia
El estado actual comprobado físicamente indica:
- `lib/jurisprudence/jurisprudence-publication-execution-runtime.ts` (**CODE_AVAILABLE: YES**, **TRACKED: YES**, **COMMITTED: YES**, SHA: `850d0a9`)
- `tests/phase-j2-web-provenance-d3-b6-runtime-composition.test.ts` (**CODE_AVAILABLE: YES**, **TRACKED: YES**, **COMMITTED: YES**, SHA: `850d0a9`)
- `app/api/admin/jurisprudence/publication/execution/route.ts` (**CODE_AVAILABLE: YES**, **TRACKED: YES**, **COMMITTED: YES**)
- `lib/jurisprudence/jurisprudence-publication-execution-http-handler.ts` (**CODE_AVAILABLE: YES**, **TRACKED: YES**, **COMMITTED: YES**)

**Repositorios Comprobados en Runtime:**
- `PostgresJurisprudenceEditorialCaseRepository` (YES)
- `PostgresJurisprudencePublicationDossierRepository` (YES)
- `PostgresJurisprudencePublicationAuthorizationRepository` (YES)
- `PostgresJurisprudencePublicProjectionRepository` (YES)

- **RUNTIME_CODE_AVAILABLE**: YES
- **RUNTIME_COMMITTED**: YES
- **RUNTIME_TESTED**: YES
- **RUNTIME_STAGING_LIVE_VERIFIED**: UNKNOWN (requiere verificación física E2E, los tests de composición no equivalen a E2E live).
- **PRODUCTION_ACTIVATED**: NO

## 2. Fases Reconciliadas de Jurisprudencia
| Fase | Estado |
|---|---|
| J1-E | CLOSED |
| J1-F | CLOSED |
| J1-G.1 a J1-G.8 | CLOSED |
| J2-A.2G | CLOSED |
| J2-A.2J | CLOSED |
| J2-A.2K-F2 | CLOSED |
| J2-A.3 | CLOSED |
| J2-WEB-PROVENANCE-P1 | CLOSED |
| J2-WEB-PROVENANCE-D1 | CLOSED (Committed `9bb46d5`) |
| J2-WEB-PROVENANCE-D2 | CLOSED / PREVIOUSLY LIVE VERIFIED (Verificación física histórica del flujo: provenance → persistencia/publication path → outbox → processor → public projection → PostgreSQL public read → withdrawal) |
| D3-B6 runtime composition | CLOSED (Committed y probado en `tests/phase-j2-web-provenance-d3-b6-runtime-composition.test.ts`) |

## 3. Preservación Histórica
La composición `J1-G` original era estrictamente un pipeline operacional (publication command -> execution -> outbox -> processor -> projection -> public read). Posteriormente el enfoque se amplió para incluir un *workflow institucional completo* (provenance -> editorial -> dossier -> authorization -> publication execution...).
D3-B6 materializa este runtime composition e integra físicamente los repositorios de Dossier y Autorización junto con la publicación.

## 4. Migraciones
Migraciones verificadas físicamente en `database/migrations/`:

| Migración | Dominio | FILE_EXISTS | COMMITTED | STAGING_APPLIED | PRODUCTION_APPLIED |
|---|---|---|---|---|---|
| `0028_...linkage.sql` | JURISPRUDENCE | YES | YES | UNKNOWN | NO |
| `0029_...nullable.sql` | JURISPRUDENCE | YES | YES | UNKNOWN | NO |
| `0030_...urls.sql` | JURISPRUDENCE | YES | YES | UNKNOWN | NO |
| `0031_...foundation.sql` | JURISPRUDENCE | YES | YES | UNKNOWN | NO |
| `0032_...persistence.sql`| JURISPRUDENCE | YES | YES | UNKNOWN | NO |
| `0033_...nova.sql` | PAYMENTS | YES | YES | UNKNOWN | NO |
| `0034_...dreadnoughts.sql`| PAYMENTS | YES | YES | UNKNOWN | NO |
| `0035_...changeling.sql` | PAYMENTS | YES | YES | UNKNOWN | NO |
| `0036_...wiggin.sql` | PAYMENTS | YES | YES | UNKNOWN | NO |
| `0037_...hex.sql` | PAYMENTS | YES | YES | UNKNOWN | NO |

*(STAGING_APPLIED figura como UNKNOWN debido a que los tests que cargan schemas no prueban aplicación persistente en la DB remota de Staging).*

## 5. Estado de STAGING (General)
- **CODE_AVAILABLE**: YES
- **TESTED**: YES
- **DEPLOYED_TO_STAGING**: UNKNOWN
- **LIVE_HTTP_VERIFIED**: UNKNOWN
- **LIVE_DB_VERIFIED**: UNKNOWN
- **LIVE_AUTH_VERIFIED**: UNKNOWN
- **LIVE_E2E_VERIFIED**: UNKNOWN

## 6. Provenance (D1/D2/D3)
Contrato actual de Provenance implementado:
- URL oficial (officialHtmlUrl, officialPdfUrl).
- Requisitos de validación de URLs (`tests/j2-d1-r2-schemas-url-validation.test.ts`).
- Migración asociada `0030_jurisprudence_public_urls.sql`.
- D3-B6 materializa la orquestación e integra componentes de governance.

## 7. Publication Runtime Composition (D3-B6)
`createJurisprudencePublicationExecutionRuntime` (lib/jurisprudence/jurisprudence-publication-execution-runtime.ts) compone:
- **Read DB / Write DB**
- `PostgresJurisprudencePublicationSourceReader`
- `PostgresJurisprudenceEditorialCaseRepository`
- `PostgresJurisprudencePublicationDossierRepository`
- `PostgresJurisprudencePublicationAuthorizationRepository`
- `PostgresJurisprudencePublicationExecutionRepository`
- `PostgresJurisprudencePublicProjectionRepository`
- `PostgresJurisprudencePublicationTransactionCoordinator`
- `DefaultJurisprudenceInternalApi`

## 8. Superficie HTTP
- `/jurisprudencia` (CODE_AVAILABLE: YES, COMMITTED: YES, STAGING_LIVE_VERIFIED: UNKNOWN, PRODUCTION_ACTIVATED: NO)
- `/jurisprudencia/[slug]` (CODE_AVAILABLE: YES, COMMITTED: YES, STAGING_LIVE_VERIFIED: UNKNOWN, PRODUCTION_ACTIVATED: NO)
- `/api/admin/jurisprudence/publication/execution` (CODE_AVAILABLE: YES, COMMITTED: YES, STAGING_LIVE_VERIFIED: UNKNOWN, PRODUCTION_ACTIVATED: NO)

## 9. Catálogo Público
- Arquitectura basada en PostgreSQL public read mediante el repositorio de proyección pública.
- Gateway efectivo configurado en código.

## 10. Auth y Seguridad
- **AUTH_CODE_CONFIGURED**: YES (Roles y autorización en `lib/jurisprudence-publication-authorization-service.ts`).
- **AUTH_TESTED**: YES (Verificado en mocks/unit tests).
- **AUTH_STAGING_LIVE_VERIFIED**: UNKNOWN (No existe prueba física de configuración E2E en Staging).
- **AUTH_PRODUCTION_CONFIGURED**: NO.

## 11. Siguiente Paso (NEXT)
**JURISPRUDENCE_NEXT** = STAGING_LIVE_VERIFICATION
**OBJECTIVE** = Verificar físicamente en STAGING el workflow institucional completo: Provenance -> Editorial -> Dossier -> Authorization -> Publication Execution -> Outbox/Processor -> Public Projection -> Public Read -> Withdrawal. Se debe comprobar: Auth0 real, roles reales, DB runtime real y rutas HTTP reales.
**PRECONDITIONS** = Ningún cambio de código requerido, validación manual E2E pendiente. No implementar código.
