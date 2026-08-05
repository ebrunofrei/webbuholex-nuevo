# Guard de rutas del workspace

Rutas reservadas: `/app`, `/app/asistente`, `/app/proyectos`, `/app/jurisprudencia`, `/app/documentos`, `/app/automatizaciones`, `/app/biblioteca`, `/app/productos`, `/app/servicios` y `/app/cuenta`.

En el estado actual todas redirigen a `/iniciar-sesion` con un `returnTo` interno saneado. Ninguna página privada llega a renderizar su placeholder por acceso HTTP público.

El middleware conserva la subruta solicitada. El layout usa `/app` como retorno defensivo si el middleware no se ejecutara. Una futura autenticación deberá reemplazar únicamente el proveedor de sesión; el contrato de navegación y el guard permanecen desacoplados.

Riesgos controlados: open redirect, sesión simulada, filtración de shell privado, mezcla de menús, exposición de datos ficticios y acceso por rutas profundas.
