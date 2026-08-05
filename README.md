# BúhoLex v2

BúhoLex es una plataforma jurídica digital desarrollada por EMCCON, organizada en una zona pública de información jurídica y un espacio inteligente reservado para futuras capacidades avanzadas.

## Estado actual

- **Fase consolidada:** 13.A.6
- **Estado técnico:** Estable.
- **Repositorio:** Privado.
- **Despliegue:** La aplicación no se encuentra desplegada; el trabajo se realiza en entorno local.
- **Indexación:** El estado de no publicación (noIndex) está configurado y comprobado en el proyecto.
- **Último commit funcional estable:** c955602

## Arquitectura funcional

### Información pública

La zona pública incluye las siguientes áreas:
- Inicio
- Servicios
- Nosotros o Institución
- Consulta profesional
- Jurisprudencia
- Asistente Jurídico BúhoLex
- Contacto
- Explorar
- Plantillas y productos informativos

### Espacio inteligente

El espacio inteligente está diseñado como un entorno separado de la zona pública. Actualmente:
- La autenticación real aún no está activa.
- No existen cuentas operativas.
- No existen pagos.
- No existen planes comerciales activos.
- No existe persistencia personal real todavía.

## Módulo Explorar

El módulo Explorar presenta 9 destinos. Sus estados actuales son:

1. **Jurisprudencia**: Interfaz pública ensamblada, buscador dormant.
2. **Manuales y guías**: En preparación.
3. **Legislación**: En preparación.
4. **Plantillas y productos**: Vista informativa.
5. **Servicios**: Disponible en modalidad consultiva.
6. **Herramientas públicas**: En preparación.
7. **Artículos**: En preparación.
8. **Institución**: Disponible.
9. **Contacto**: Disponible.

## Plantillas y productos

- **Producto de referencia**: BL-LEG-CON-001
- **Vista**: Vista previa editorial.
- **Estado comercial**: Sin precio activo, sin licencia activa, sin compra, sin pago, sin descarga pública.
- **Llamada a la acción (CTA)**: “Solicitar personalización”
- **Destino**: /consulta-profesional/

## Servicios

Los servicios son visibles como un catálogo público en modalidad consultiva.
- No existe pago inmediato.
- SRV-WEB-001 mantiene:
  - `allowsImmediatePayment: false`
  - `published: false`
La visibilidad pública no equivale a transacción o publicación comercial.

## Jurisprudencia pública

- **Ruta**: /jurisprudencia/
- **Interfaz**: Interfaz pública ensamblada en estado default-deny.
- **Gateway**: No configurado.
- **Readiness**: Inactivo.
- **Corpus**: Sin corpus real habilitado; sin resultados ficticios.
- **Control de búsqueda**:
  - Botón: “BÚSQUEDA EN PREPARACIÓN”
  - Estado: `disabled`, con `aria-disabled="true"`
  - Mensaje del estado público: “Búsqueda pública no disponible”
- Los filtros son visibles únicamente como presentación de la experiencia futura; no se ejecutan búsquedas reales ni se altera la URL al pulsar, porque el control está deshabilitado.

## Seguridad comercial y operativa

Se establece expresamente:
- Sin pagos activos.
- Sin checkout.
- Sin descarga pública.
- Sin licencias comerciales activas.
- Sin autenticación real.
- Sin despliegue.
- Sin GitHub Pages.
- Sin workflows.
- Sin releases.
- Sin deployments.
- Sin datos jurídicos simulados presentados como reales.

## Validación técnica

Resultados vigentes de las validaciones:
- **ESLint**: Aprobado.
- **TypeScript typecheck**: Aprobado.
- **Test Files**: 61/61
- **Tests**: 808/808
- **Build**: Aprobado.
- **Rutas generadas**: 46/46
- **Última validación funcional**: Commit c955602.

## Repositorio y respaldo

- **Repositorio privado**: https://github.com/ebrunofrei/buholex-v2
- **Rama**: master
- **Upstream**: origin/master
- **Visibilidad**: PRIVATE
- **GitHub Pages**: Desactivado

## Desarrollo local

Requisitos: Node.js 22 o superior y pnpm 11.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Reglas de desarrollo

- No inventar jurisprudencia.
- No activar funcionalidades comerciales sin autorización.
- No publicar ni desplegar sin autorización.
- Validar escritorio, tablet y móvil.
- Ejecutar lint, typecheck, tests y build.
- Crear commit y push después de cada fase estable.
- Mantener el default-deny en integraciones externas.

## Próximas fases

Pendientes por implementar:
- Incorporación controlada de corpus jurisprudencial real y verificable.
- Configuración futura de gateway real.
- Activación futura de autenticación.
- Memoria documental.
- Funcionalidades inteligentes.
- Publicación, solo después de revisión jurídica, técnica y comercial.
