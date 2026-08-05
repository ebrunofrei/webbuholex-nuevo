# Arquitectura pública y privada de producto

## Refinamiento de Fase 10.D

El catálogo público de servicios utiliza datos tipados y fichas dinámicas. Las solicitudes solo preparan información local y los enlaces de WhatsApp transmiten un saludo institucional o el título público del servicio, nunca el contenido de una consulta. La aplicación privada `/app` permanece protegida y no recibe cambios funcionales en esta fase.

## Portal

`/` funciona exclusivamente como decisión entre información pública y futuro espacio inteligente. No carga catálogo, búsquedas, formularios ni navegación pública completa.

## Zona pública

`/explorar` concentra navegación, búsqueda y lectura gratuitas. Reutiliza los modelos públicos tipados y nunca lee `product-assets` durante el render.

## Preparación autenticada

`/iniciar-sesion` explica por qué existirá una cuenta, pero no contiene formulario ni realiza autenticación.

`/espacio` presenta capacidades futuras sin usuario, plan, saldo, historial o compra ficticios.

## Información privada

Inventarios, hashes, rutas internas, archivos maestros, cesiones, firmas y documentos personales permanecen fuera de estas vistas. El panel legal solo muestra información corporativa aprobada y estados pendientes honestos.
