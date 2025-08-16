const brandingBase = {
  logoUrl: "",
  nombreEstudio: nombre || "Mi Estudio Legal",
  colorPrimary: "#b03a1a",
  casillas: [
    {
      nombre: "Casilla de Expedientes",
      icono: "📁",
      modulos: [
        {
          key: "expedientes",
          label: "Expedientes",
          route: "/casilla-expedientes",
          visible: true,
        },
      ],
    },
    {
      nombre: "Agenda de Audiencias",
      icono: "📅",
      modulos: [
        {
          key: "agenda",
          label: "Agenda",
          route: "/agenda",
          visible: true,
        },
      ],
    },
    {
      nombre: "Notificaciones",
      icono: "🔔",
      modulos: [
        {
          key: "notificaciones",
          label: "Notificaciones",
          route: "/notificaciones",
          visible: true,
        },
      ],
    },
  ],
};
