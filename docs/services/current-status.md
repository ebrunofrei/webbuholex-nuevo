# Estado Actual de Servicios (Handoff)

## Resumen Ejecutivo
- **SERVICES_STATUS**: CLOSED / CODE READY / NOT YET DEPLOYED
- **SERVICES_NEXT**: NO IMPLEMENTATION

La vertical de Servicios no debe reabrirse salvo para: corrección funcional, actualización de contenido, trabajo frontend expresamente autorizado, o preparación final de release.

## 1. Trazabilidad
- **SERVICES_CANONICAL_COMMIT**: `be1a726a64a4cb36a96b089cb8fda82d23962df5`
- **SERVICES_CHANGED_AFTER_CANONICAL**: NO

## 2. Mapa Exacto de Archivos
- **Rutas (Exclusivo de Servicios)**:
  - `app/servicios/page.tsx`
  - `app/servicios/[slug]/page.tsx`
- **Componentes (Exclusivo de Servicios)**:
  - `components/services/service-catalog.tsx`
  - `components/services/service-detail.tsx`
  - `components/services/services-experience.tsx`
  - `components/services/commercial-blocks.tsx`
- **Datos (Fuente de verdad canónica)**:
  - `data/services.ts`
- **Imágenes**:
  - `public/services/details/*.webp` (24 imágenes comprobadas físicamente)

## 3. Rutas
- `/servicios`: Catálogo general implementado en código.
- `/servicios/[slug]`: Detalle por servicio implementado en código, con metadata de página.
- Manejo de rutas inexistentes (404/notFound) incorporado.
- **Production activation**: NO; la vertical todavía no ha sido desplegada dentro del release público objetivo.

## 4. Fuente de Verdad
- **SERVICES_SOURCE_OF_TRUTH**: `data/services.ts` sigue siendo la fuente exclusiva de datos.

## 5. Contrato Comercial
Físicamente verificado en `data/services.ts`:
- **SERVICES_PAYMENT_MODE**: Mayoritariamente `quote_required`
- **SERVICES_REQUIRES_EVALUATION**: `true` (en la mayoría de los casos declarados)
- **SERVICES_IMMEDIATE_PAYMENT**: `false` (comprobado en todos los registros)

## 6. Integración con Payments
- **SERVICES_PAYMENTS_DEPENDENCY**: DECLARATIVE_ONLY.

Servicios contiene metadatos comerciales declarativos en `data/services.ts`, como `pricingMode`, `requiresEvaluation` y `allowsImmediatePayment`, pero dichos campos NO activan ningún runtime de Payments.

Servicios:
- NO importa el runtime de Payments.
- NO llama APIs de Payments.
- NO ejecuta Culqi.
- NO crea `PaymentOrder`.
- NO crea `PaymentQuote`.
- NO inicia checkout sessions.
- NO depende de Supabase para renderizar el catálogo o sus fichas públicas.

## 7. CTAs Actuales
Físicamente verificados en `components/services/service-detail.tsx`:
- **SERVICES_CTA_1**: `/consulta-profesional?service=${service.slug}`
- **SERVICES_CTA_2**: Enlace a WhatsApp (generado por `buildServiceWhatsAppUrl(service.title)`)

## 8. Auth / Acceso
- **PUBLIC_ROUTE**: YES
- **AUTH0_REQUIRED**: NO
- **SESSION_REQUIRED**: NO
- **PREVIEW_ONLY**: NO

## 9. Build State
Validación sin errores:
- `pnpm typecheck`: OK
- `pnpm build`: OK
- `pnpm test`: OK
- `git diff --check`: Limpio (archivos trackeados).

## 10. Production Status
- **SERVICES_CODE_READY**: YES
- **SERVICES_IN_PRODUCTION**: NO
- **SERVICES_RELEASE_STRATEGY**: JOINT_PUBLIC_RELEASE (Se desplegará junto con Jurisprudencia y las páginas legales).
