# Contrato del read model público 11.L

Estado: aprobado y validado. El read model se construye determinísticamente desde la proyección interna de 11.K mediante una lista blanca estricta. Conserva identidad y versión y excluye actores, observaciones, decisiones, razones, claves de idempotencia, hashes, datos personales no aprobados, infraestructura, SQL, rutas, tokens y secretos.

Los estados cerrados son `prepared_internal`, `exposure_pending`, `exposed`, `withdrawn`, `superseded` y `rejected`. Los comandos validados son `evaluate_exposure`, `prepare_public_read_model`, `expose`, `withdraw` y `supersede`. No existe bypass ni estado ambiguo `published`.

Proyección interna ≠ read model público. Read model público preparado ≠ exposición pública. Una exposición ficticia dentro de pruebas no constituye exposición real.
