# Fase 11.F.1 — Respuesta a incidentes de identidad

No existe monitoreo real. Este documento define un procedimiento propuesto; responsables y retención están pendientes de aprobación institucional.

| Escenario | Detección | Contención y revocación | Recuperación y evidencia |
|---|---|---|---|
| Secreto filtrado | alerta del proveedor, repositorio o auditoría | deshabilitar secreto, rotar, revocar sesiones afectadas | verificar despliegues, preservar IDs de evento y documentar alcance |
| Sesión robada | anomalía de sesión o aviso del titular | revocar sesión y rotar credenciales relacionadas | reautenticar, revisar eventos mínimos y cerrar sesiones vinculadas |
| Cuenta comprometida | login anómalo o reporte | suspender identidad, revocar todas las sesiones | recuperación/MFA, restaurar roles mínimos y documentar aprobación |
| Proveedor caído | health/status oficial | default deny para operaciones internas | activar comunicación, recuperar al proveedor; no crear bypass |
| Rol indebido | revisión de matriz o auditoría | retirar rol e incrementar versión | invalidar sesiones y registrar quién aprobó la corrección |
| Replay | reutilización de referencia rotada | revocar familia de sesión | revisar rotación, expiración y atomicidad |
| Tokens inválidos masivos | incremento de rechazos agregados | limitar tráfico en infraestructura futura | verificar issuer/audience/keys sin registrar tokens |
| Revocación fallida | resultado `unavailable` | bloquear operación privilegiada y reintentar controladamente | reconciliar session store y proveedor |
| Dependencia vulnerable | advisory oficial | evaluar exposición, inmovilizar despliegue y preparar actualización | probar actualización y rollback antes de publicar |
| Pérdida de acceso administrativo | imposibilidad de operar tenant | usar recuperación institucional previamente registrada | rotar credenciales y revisar propietarios; responsable pendiente |

## Comunicación y retención

La comunicación se limitará a responsables institucionales, personas afectadas y autoridades cuando corresponda. El periodo de conservación de eventos no se fija como obligación legal en esta fase: requiere finalidad, base jurídica, acceso, eliminación y política de incidentes aprobadas.
