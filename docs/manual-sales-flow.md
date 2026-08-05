# Arquitectura de venta manual

No existe pago, almacenamiento, correo ni contacto de WhatsApp activo.

Para `BL-LEG-CON-001` tampoco existe todavía una solicitud comercial activa. Su registro conserva `priceStatus: "pending"`, `licenseStatus: "pending"`, referencias de archivo en `null` y autorizaciones de descarga en `false`.

```text
Ficha aprobada
→ Solicitar esta plantilla / personalización
→ Consulta profesional
→ requested
→ reviewing
→ awaiting_payment
→ paid
→ preparing
→ delivered
```

Salidas alternativas: `cancelled` y `refunded`. Las transiciones permitidas están en `data/manual-order-workflow.ts`.

## Controles

- el precio siempre procede del producto aprobado, no de la solicitud;
- la administración confirma alcance y disponibilidad;
- el pago futuro se concilia con referencia verificable;
- la entrega futura registra evidencia y versión exacta;
- la personalización constituye un encargo separado;
- WhatsApp permanece deshabilitado hasta recibir un número institucional aprobado;
- no se utiliza correo hasta aprobar proveedor, remitente y plantillas transaccionales.
- la plantilla maestra interna nunca forma parte de la entrega pública;
- ninguna versión comercial o anexo se entrega hasta registrar su ubicación real, autorización y versión exacta.

## Registro futuro de entrega

`ManualProductDelivery` conserva:

- pedido y código de producto;
- versión exacta del paquete;
- identificadores documentales entregados;
- fecha y responsable de entrega;
- referencia de evidencia;
- confirmación del cliente.

El control de integridad debe rechazar identificadores internos, desconocidos, retirados, no aprobados o sin referencia. Este contrato no implementa correo, enlaces temporales, ZIP, almacenamiento ni firma digital.

## Datos institucionales pendientes

- razón social y datos contractuales definitivos de EMCCON;
- responsables editoriales y revisores;
- profesionales, colegiaturas verificadas y jurisdicciones;
- precios, impuestos, reembolsos y comprobantes;
- número oficial de WhatsApp;
- horarios y tiempos de respuesta;
- licencia de uso y política de personalización;
- privacidad, retención y Libro de Reclamaciones funcional.
