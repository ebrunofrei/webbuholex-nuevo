# Retiro técnico y supersesión — Fase 11.K

El retiro marca ejecución y proyección como retiradas, conserva el historial y usa una razón cerrada. No revoca ni altera la autorización institucional original.

Revocación institucional ≠ retiro técnico.

Retiro técnico ≠ eliminación del historial.

La supersesión conserva ejecución y proyección históricas. Una versión nueva no hereda expediente editorial, dossier, autorización, ejecución ni proyección vigente.

La corrección validada crea primero la versión 2 y sus expedientes vigentes; después marca `superseded` la autorización ficticia de versión 1. 11.K bloquea mediante `authorization_superseded`. Una prueba separada mantiene `VERSION_CONFLICT` cuando la versión nueva todavía no existe.

Retiro y supersesión, historial e idempotencia fueron aprobados dentro de las 35 pruebas específicas.
