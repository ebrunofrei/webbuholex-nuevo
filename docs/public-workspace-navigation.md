# Navegación pública, de acceso y privada

Los tres menús son contratos independientes en `data/navigation.ts`.

## PublicHeader

Se muestra en `/explorar`, `/jurisprudencia`, `/asistente` y las demás rutas públicas. Incluye Explorar, Jurisprudencia, Legislación, Manuales, Plantillas, Servicios, Herramientas y Contacto. Su única acción de acceso es `INGRESAR` hacia `/iniciar-sesion`.

## AuthHeader

Se muestra solo en `/iniciar-sesion`. Contiene marca, regreso a información pública y acceso al panel de transparencia. No incorpora el directorio público completo ni el menú privado.

## WorkspaceHeader y WorkspaceNavigation

Pertenecen exclusivamente al layout de `/app`. Preparan Inicio, Asistente, Proyectos, Jurisprudencia asistida, Documentos, Automatizaciones, Biblioteca, Productos, Servicios y Cuenta. No muestran identidad, avatar, plan, créditos, consumo o historial ficticios.

Cada elemento declara `id`, `label`, `href`, `accessLevel`, `visibility`, `icon` y `activeMatch`.
