# Complaints Production Release Checklist

## A. OUT-OF-BAND PRODUCTION ENVIRONMENT PROVISIONING
Esta operación debe ocurrir ANTES de ejecutar cualquier script de migración. Es un procedimiento administrativo, manual o a través de infraestructura como código (IaC), que configura el target productivo inicial.

- [ ] Crear la base de datos productiva.
- [ ] Configurar passwords de complaints_api_login y complaints_worker_login out-of-band.

## B. PRODUCTION MIGRATION RUNNER
El migrator soporta dos flujos estrictos:
1. **First Production Migration**: Para bases de datos productivas vírgenes (una DB se considera virgin solamente cuando `complaints_private` NO existe, el journal físico `drizzle.__drizzle_migrations` NO existe, y ninguno de los cuatro roles/logins Complaints existe; cualquier rastro parcial => fail closed), el wrapper aplica las migraciones y, si es exitoso, crea el `environment_marker` validando tu identidad.
2. **Subsequent Production Migrations**: Para instalaciones existentes, el wrapper exige de manera estricta que el `environment_marker` pre-exista y apunte a `production` antes de aplicar cualquier migración estructural.

- [ ] configurar secrets.
- [ ] configurar URLs (DATABASE_MIGRATION_URL).
- [ ] configurar production target (COMPLAINTS_PRODUCTION_PROJECT_REF, COMPLAINTS_PRODUCTION_DATABASE, COMPLAINTS_PRODUCTION_ALLOWED_HOST).
- [ ] configurar confirmación estricta (COMPLAINTS_PRODUCTION_CONFIRM=I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION).
- [ ] ejecutar pnpm run db:migrate:production.
- [ ] si es *First Deploy*, el runner insertará el marker post-migración para amarrar la identidad.
- [ ] si es *Subsequent Deploy*, el runner verificará la identidad pre-existente en el marker antes de iniciar.

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
