# Dirección de arte del portal dual

El portal raíz conserva dos accesos primarios: información pública y acceso personal. No incorpora navegación tradicional, catálogo, formularios ni contenido secundario.

## Activo institucional

Se utiliza `public/brand/buho-institucional.png` con dimensiones reservadas de 784 × 1059. El PNG ya contiene transparencia real, por lo que no se creó, recortó ni regeneró la mascota. La figura completa conserva orejas, balanza, libro, pedestal y texto.

La integración elimina la apariencia rectangular mediante un halo circular independiente, fondo radial, aire periférico y sombra aplicada a la silueta transparente. La imagen no tiene marco, tarjeta ni fondo propio.

## Movimiento

- entrada de 720 ms con opacidad, desplazamiento vertical y escala 0.97;
- flotación vertical máxima de 6 px en un ciclo lento;
- desplazamiento del halo de 7 px hacia la opción enfocada;
- contraste coordinado entre ambas zonas;
- énfasis del indicador de acción.

`prefers-reduced-motion: reduce` elimina entrada, flotación y transiciones no esenciales. La navegación y el contenido permanecen completos sin animación.

## Responsive

En escritorio se conserva la división 50/50 y el halo ocupa la columna central. En móvil las zonas se apilan y el búho se ubica entre ambas sin textos posicionados de forma absoluta. El control legal mantiene separación del borde mediante safe area.
