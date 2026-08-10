# Complaints Production Release Checklist

## A. OUT-OF-BAND PRODUCTION ENVIRONMENT PROVISIONING
Esta operacin debe ocurrir ANTES de ejecutar cualquier script de migracin. Es un procedimiento administrativo, manual o a travs de infraestructura como cdigo (IaC), que configura el target productivo inicial.

- [ ] Crear la base de datos productiva.
- [ ] Configurar passwords de complaints_api_login y complaints_worker_login out-of-band.
- [ ] Crear el schema complaints_private.
- [ ] Crear la tabla complaints_private.environment_marker.
- [ ] Insertar la fila de identidad productiva con:
      - id = 1
      - environment = 'production'
      - project_ref = 'tu_project_ref'
      - database_name = 'tu_database_name'
- [ ] El runner de migraciones NUNCA debe crear ni modificar este marker.

## B. PRODUCTION MIGRATION RUNNER
Esta operacin slo verifica el marker preexistente (creado en el paso A) y, si todo coincide, aplica las migraciones estructurales.

- [ ] configurar secrets.
- [ ] configurar URLs (DATABASE_MIGRATION_URL).
- [ ] configurar production target (COMPLAINTS_PRODUCTION_PROJECT_REF, COMPLAINTS_PRODUCTION_DATABASE, COMPLAINTS_PRODUCTION_ALLOWED_HOST).
- [ ] configurar confirmacin estricta (COMPLAINTS_PRODUCTION_CONFIRM=I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION).
- [ ] ejecutar pnpm run db:migrate:production.
- [ ] el runner verificar que la DB sea la correcta y el marker productivo preexista.
- [ ] si el marker es vlido, aplicar migraciones pendientes (READ-ONLY respecto a la identidad).

## C. Verificacin
- [ ] roles (complaints_api_runtime, complaints_outbox_worker, etc.).
- [ ] memberships.
- [ ] ACL.
- [ ] PUBLIC sin acceso indebido.
- [ ] worker isolation garantizado.
- [ ] contracts verificados (environment marker intacto).

## D. Smoke
- [ ] pipeline real (API request test).
- [ ] transaccin controlada.
- [ ] sentinel rollback.
- [ ] cero residuos en DB de prueba.
- [ ] sequence state restored.

## E. Release gate
- [ ] merge a main.
- [ ] push.
- [ ] deploy.
- [ ] post-deploy HTTP smoke.
