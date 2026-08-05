# Arquitectura del catálogo de servicios

El catálogo utiliza `PublicService`, un esquema Zod y una única colección tipada. `/servicios` muestra el inventario y `/servicios/[slug]` resuelve cada ficha sin `react-router-dom` ni una segunda aplicación.

## Campos controlados

Cada servicio declara identificador, slug, título, categoría, resumen, descripción, alcance, exclusiones, modalidades, disponibilidad, modo de precio, controles de conflicto y evaluación, posibilidad de pago, responsable, CTA, estado y advertencia.

Todos los servicios mantienen:

- `allowsImmediatePayment: false`;
- `price: null`;
- `currency: null`;
- `responsible: null` mientras no exista designación aprobada.

## Inventario inicial

1. Asesoría jurídica.
2. Revisión y personalización documental.
3. Patrocinio y defensa.
4. Consulta profesional por videoconferencia.
5. Servicios empresariales.
6. Servicios administrativos.
7. Ingeniería civil para saneamiento inmobiliario.

El servicio técnico exige evaluación previa y no garantiza viabilidad, inscripción ni resultado municipal o registral. Su solicitud usa `/consulta-profesional?service=<slug>` y el formulario solo reconoce slugs existentes.
