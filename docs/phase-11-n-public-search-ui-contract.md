# Fase 11.N — Contrato de interfaz pública

La interfaz de `/jurisprudencia` consume exclusivamente `JurisprudencePublicSearchGateway`. Incluye búsqueda principal, filtros de institución, órgano, materia, tipo, expediente, resolución y fechas, orden cerrado y paginación por página.

Los estados visibles son: inicial, carga, resultados, vacío, no configurado, consulta inválida y error controlado. El estado operativo real es `not_configured` y comunica de forma no técnica que el buscador aún no está habilitado.

Las tarjetas solo muestran título, institución, órgano, materia, expediente, resolución, fecha, resumen y fuente públicos. No ofrecen descargar, comprar, publicar, editar, aprobar, autorizar, ejecutar o administrar.

La UI no importa repositorios, adaptadores, SQLite, servicios internos 11.G–11.M, Auth0 o secretos. Una interfaz visible no implica datos reales disponibles.
