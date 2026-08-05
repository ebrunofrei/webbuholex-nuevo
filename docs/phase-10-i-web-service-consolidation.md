# Fase 10.I — Consolidación de SRV-WEB-001

## Propósito

La fase consolida `SRV-WEB-001 — Diseño y desarrollo de páginas web profesionales` como un servicio digital sujeto a evaluación técnica y comercial. No crea un paquete automático ni una contratación inmediata.

## Fuente de datos

El registro permanece en `data/services.ts`, dentro del mismo catálogo tipado y validado por `PublicService` y `publicServiceSchema`. No existe una colección paralela.

Valores comerciales preservados:

- `price: null`;
- `currency: null`;
- `responsible: null`;
- `allowsImmediatePayment: false`;
- `requiresEvaluation: true`;
- `published: false`.

El CTA conserva `/consulta-profesional?service=diseno-desarrollo-paginas-web-profesionales`.

## Modelo ampliado

Los campos opcionales añadidos permiten explicar el servicio sin afectar los siete registros anteriores:

- `siteTypes`: clases de solución que pueden evaluarse;
- `moduleGroups`: módulos clasificados como básico, opcional, sujeto a evaluación o integración futura;
- `budgetFactors`: variables que determinan propuesta y presupuesto;
- `technicalResponsibilities`: separación de diseño, desarrollo, dominio, hosting, correo, contenidos, SEO técnico, mantenimiento, soporte e integraciones;
- `clientContentNotice`: responsabilidad del cliente sobre derechos de uso de los materiales entregados.

Los esquemas Zod validan estas estructuras y sus niveles permitidos. No se introdujo `any`.

## Interpretación comercial

“Básico” identifica una familia funcional inicial, pero no significa inclusión automática. Toda prestación debe aparecer en la propuesta aprobada. “Opcional” requiere selección expresa; “sujeto a evaluación” requiere análisis técnico y comercial; “integración futura” no se presenta como capacidad activa ni predeterminada.

Dominio, hosting, correo corporativo, mantenimiento, soporte, pagos, áreas privadas, analítica, asistentes e integraciones pueden depender de proveedores externos y costos separados. La ficha no garantiza posicionamiento, ventas, resultado comercial, seguridad absoluta ni fechas sin evaluación.

## Flujo de evaluación

1. Evaluación inicial.
2. Definición del alcance.
3. Propuesta técnica y económica.
4. Recolección de contenidos autorizados.
5. Diseño de estructura e interfaz.
6. Desarrollo.
7. Revisión del cliente.
8. Correcciones comprendidas en el alcance.
9. Validación técnica.
10. Entrega o publicación autorizada.
11. Mantenimiento, cuando sea contratado.

El formulario actual solo reconoce el servicio y valida localmente. No transmite ni almacena información, no crea expedientes, no recibe archivos y no inicia pagos.

## Identidad visual

La ficha reutiliza el sistema institucional validado: blanco y rojo para información pública; marrón para el resumen comercial; azul para integración futura; verde para estados básicos/positivos; ámbar para evaluación. Los niveles incorporan texto visible y no dependen solo del color.

La imagen publicitaria aportada no se incorpora al sitio ni se utiliza como evidencia de oficinas, trabajadores, clientes, infraestructura o proyectos reales.

## Restricciones conservadas

No se implementan autenticación, pagos, QR, compra, descarga, agenda externa, almacenamiento, base de datos, analítica, chat, dominio, hosting, publicación o despliegue. La arquitectura del portal y el estado editorial de `BL-LEG-CON-001` permanecen sin cambios.

## Corrección probatoria única

El único cambio posterior a la implementación funcional fue la corrección de un falso positivo en `tests/phase-10-i-web-service.test.tsx`. La expresión regular dejó de interpretar la secuencia legítima «CCI» dentro de otras palabras y pasó a comprobar `QR`, `cuenta bancaria` y `CCI` como términos completos. No se modificaron la ficha, el catálogo, los tipos, los esquemas, el CTA ni los estados comerciales.

## Validación oficial externa

El árbol original administrado por Codex mantuvo un bloqueo `EPERM` al intentar abrir los binarios de las herramientas dentro de `node_modules`. El bloqueo ocurrió antes de ejecutar ESLint, TypeScript, Vitest o Next.js y no fue atribuido al código del proyecto.

La validación oficial se realizó con el mismo código fuente sincronizado en:

`C:\Users\USER\Documents\Proyectos\buholex-v2-validacion`

La copia externa conservó su `node_modules` funcional. No se copiaron dependencias, `.next` ni artefactos de compilación al proyecto original.

Resultados confirmados:

| Comando | Código | Resultado |
| --- | ---: | --- |
| `pnpm lint` | `0` | Aprobado. |
| `pnpm typecheck` | `0` | Aprobado. |
| `pnpm test` | `0` | 31 archivos de prueba (31 suites reportadas) y 188 pruebas aprobadas. |
| `pnpm build` | `0` | Next.js 15.5.9; 46 de 46 páginas generadas. |

La suite específica de la fase aprobó 8 de 8 pruebas y `/servicios/[slug]` generó ocho rutas, incluida `SRV-WEB-001`.

La ejecución de pruebas mostró advertencias no bloqueantes de jsdom/React Testing Library relativas a `HTMLCanvasElement.getContext()` y actualizaciones de `LinkComponent` no envueltas en `act(...)`. La salida no se califica como completamente libre de advertencias. No se instaló `canvas`, no se cambiaron dependencias y no se intentó ocultar esos avisos.

Con los cuatro códigos de salida `0`, la consolidación de `SRV-WEB-001` queda oficialmente aprobada.
