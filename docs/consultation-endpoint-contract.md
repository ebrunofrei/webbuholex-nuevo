# Contrato futuro de consulta profesional

No existe endpoint en esta fase. El formulario realiza validación local y descarta los datos al recargar.

## Operación futura

`POST /api/v1/professional-consultations`

Entrada validada por `professionalConsultationFormSchema`:

- nombre;
- correo;
- teléfono o WhatsApp;
- materia;
- jurisdicción;
- tipo de atención;
- urgencia;
- descripción;
- existencia y descripción de plazo;
- aceptación de privacidad;
- autorización de contacto.

## Respuesta propuesta

- `202 Accepted` con identificador, estado `requested`, fecha y trace ID.
- `400` para formato inválido.
- `409` para solicitud duplicada bajo una futura clave de idempotencia.
- `422` cuando falte consentimiento o información obligatoria.
- `429` por límite de frecuencia.

## Controles previos

- política de privacidad vigente;
- cifrado en tránsito y reposo;
- minimización y retención aprobadas;
- protección anti-spam;
- consentimiento versionado;
- redacción de logs;
- conflicto de interés y derivación;
- confirmación administrativa sin promesas de aceptación o resultado.

No se enviarán adjuntos desde este endpoint inicial.
