# Retiro, supersesión e historial 11.L

Estado: aprobado. El retiro desactiva exclusivamente la exposición ficticia y conserva el read model, la proyección interna, la autorización y el historial. La supersesión exige una versión nueva vigente y no hereda exposición.

Cada mutación validada usa revisión esperada, clave de idempotencia y evento append-only. La misma clave y payload devuelve el mismo resultado; la reutilización con otro payload se rechaza. La concurrencia optimista impide sobrescrituras silenciosas. Memoria, SQLite `:memory:` y SQLite temporal validaron cierre, reapertura, recuperación, limpieza y lifecycle idempotente.
