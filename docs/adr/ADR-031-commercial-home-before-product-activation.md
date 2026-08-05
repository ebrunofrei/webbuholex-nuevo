# ADR-031: Portada comercial antes de activación de producto

## Estado
Aceptado

## Contexto
BúhoLex cuenta con infraestructura probada (DualPortal, AssistantInterface, Gateways), pero necesita presentarse comercialmente para captar clientes antes de habilitar LitisBot y el corpus jurisprudencial completo (que permanecen en "en preparación" bajo Fase 11).

## Decisión
Desplegar una portada (`CommercialHome`) puramente estacional/presentacional que reemplaza a `DualPortal` en `/`. Modificar la navegación pública para destacar `/servicios/` y `/consulta-profesional/`, ocultando las rutas en desarrollo sin eliminarlas.

## Consecuencias
- Habilita la presentación profesional del servicio y la captura de leads mediante WhatsApp y formulario de contacto (desarrollado en 12.C).
- Mantiene aislados, seguros y no publicados los productos reales y bases de datos.
- Requerirá revertir parte de esta estructura cuando los sistemas autónomos superen las validaciones finales y se lancen al público.
