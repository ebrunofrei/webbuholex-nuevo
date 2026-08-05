# ADR 030: Direct Contact Without External Form Service

## Contexto
En la Fase 12.C, se requería activar los canales comerciales de BúhoLex (`/consulta-profesional` y `/contacto`) para la captación real de consultas, pero con restricciones estrictas de infraestructura: no usar bases de datos, no usar endpoints propios ni servicios externos de correo (Formspree, Resend, SendGrid).

## Alternativas Consideradas
1. **Desarrollar un endpoint propio con Resend/SendGrid**: Descartado temporalmente debido a la restricción de infraestructura que prohíbe conexiones externas y base de datos.
2. **Utilizar servicios como Formspree o Typeform**: Descartado por dependencias de terceros no autorizadas.
3. **Generación en el cliente y redirección (`mailto:` y `wa.me`)**: Aceptado.

## Decisión
Se decidió implementar la captación de prospectos mediante la codificación directa de los datos capturados en el formulario cliente y su redirección hacia los servicios nativos del usuario (WhatsApp web/móvil o su cliente de correo predeterminado).

## Justificación
Esta solución satisface el requerimiento de conversión comercial (permite que los usuarios se pongan en contacto con estructura predefinida) sin romper ninguna restricción arquitectónica actual, y educa al usuario con total transparencia técnica (informando explícitamente que la web no almacena los datos).

## Consecuencias
- **Positivas**: Cero dependencias externas, cero costos de servidor, alta privacidad y cumplimiento estricto de las reglas.
- **Negativas**: Dependencia de que el usuario final tenga un cliente de correo o WhatsApp configurado en el dispositivo para concluir el envío real.
