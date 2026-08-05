# Vigencia, revocación y supersesión — Fase 11.J

Una autorización ficticia solo es vigente cuando tiene estado `authorized`, no fue revocada ni supersedida, alcanzó `effectiveFrom` y no superó `expiresAt`.

La expiración se evalúa con reloj inyectable y no elimina el caso ni su historial. La revocación agrega un evento, incrementa la versión y conserva la decisión anterior. Una nueva versión del registro no hereda autorización, asignaciones ni decisiones: el caso anterior pasa a `superseded` y conserva su historia.

No existe reactivación automática, `forceApprove`, `forcePublish`, override ni bypass.

La suite oficial confirmó que expiración, revocación y supersesión preservan el historial y que la publicación nunca se ejecuta. El estado real continúa sin decisión institucional, sin autorización vigente y con `publicationExecuted: false`.
