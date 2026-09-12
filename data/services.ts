import { publicServiceCatalogSchema } from "@/lib/schemas/services";
import type { PublicService } from "@/types/services";

const engineeringWarning = "La viabilidad depende de la documentación existente, situación física, antecedentes registrales, zonificación, competencia municipal y requisitos aplicables al caso.";

const serviceRecords = [
  {
    id: "SRV-LEGAL-001",
    slug: "asesoria-juridica",
    title: "Asesoría jurídica",
    category: "legal",

    summary:
      "Evaluación profesional de una situación concreta para identificar riesgos jurídicos, comprender las alternativas disponibles y definir una ruta de actuación.",

    description:
      "La asesoría jurídica parte del análisis individual de los hechos, la documentación disponible, la jurisdicción aplicable y el objetivo de la consulta. Permite ordenar el problema, identificar riesgos, evaluar alternativas y determinar qué actuación jurídica resulta razonable antes de asumir decisiones, iniciar procedimientos o contratar una intervención de mayor alcance.",

    detailImage: {
      src: "/services/details/asesoria-juridica.webp",
      alt: "Abogada revisando documentación con clientes durante una sesión de asesoría jurídica profesional.",
    },

    publicTagline:
      "Análisis individual antes de decidir cómo actuar.",

    targetAudience: [
      "Personas que necesitan iniciar, responder o evaluar una actuación judicial, administrativa o contractual.",
      "Personas que han recibido una demanda, resolución, requerimiento, imputación, carta o comunicación con posibles efectos jurídicos.",
      "Empresas y organizaciones que requieren estructurar documentos jurídicos antes de adoptar decisiones o asumir obligaciones.",
      "Profesionales independientes que necesitan formalizar una posición, responder un requerimiento o documentar adecuadamente una operación.",
      "Abogados y otros profesionales que requieren apoyo especializado en la revisión, estructuración o elaboración de documentos complejos.",
      "Administrados, funcionarios, servidores o proveedores que deben formular solicitudes, descargos, recursos u otras actuaciones ante entidades públicas.",
    ],

    needs: [
      "Comprender la situación jurídica antes de iniciar un procedimiento o asumir una obligación.",
      "Identificar riesgos legales que podrían no ser evidentes a primera vista.",
      "Evaluar distintas alternativas de actuación y sus posibles consecuencias.",
      "Revisar documentos, comunicaciones o antecedentes vinculados con la consulta.",
      "Determinar si el asunto requiere negociación, actuación administrativa, conciliación, arbitraje, patrocinio judicial u otra intervención especializada.",
      "Definir los siguientes pasos antes de asumir costos o compromisos adicionales.",
    ],

    scope: [
      "Evaluación inicial de los hechos y antecedentes relevantes.",
      "Revisión de la documentación disponible relacionada con la consulta.",
      "Identificación preliminar de riesgos jurídicos.",
      "Determinación de las materias y normas que requieren análisis.",
      "Evaluación de alternativas de actuación.",
      "Orientación sobre los siguientes pasos razonables según el caso.",
    ],

    evaluationInputs: [
      "Relato cronológico y suficientemente preciso de los hechos.",
      "Documentos, contratos, resoluciones, comunicaciones o antecedentes disponibles.",
      "Identificación de las personas, entidades o instituciones involucradas.",
      "Información sobre procedimientos, procesos o trámites actualmente en curso, cuando corresponda.",
      "Plazos, notificaciones o fechas relevantes que puedan condicionar una actuación.",
      "Objetivo concreto que el solicitante espera alcanzar o proteger.",
    ],

    potentialDeliverables: [
      "Orientación jurídica sobre la situación consultada.",
      "Identificación de riesgos y puntos que requieren especial atención.",
      "Explicación de alternativas razonables de actuación.",
      "Recomendación de los siguientes pasos según la información evaluada.",
      "Determinación preliminar de si corresponde una intervención profesional adicional.",
    ],

    stages: [
      "Recepción de la consulta y delimitación inicial del problema",
      "Revisión de antecedentes y documentación disponible",
      "Identificación de cuestiones jurídicas relevantes",
      "Evaluación de riesgos y alternativas de actuación",
      "Explicación de conclusiones y siguientes pasos",
    ],

    prerequisites: [
      "Proporcionar información suficiente para comprender el contexto del asunto.",
      "Entregar los documentos relevantes disponibles cuando sean necesarios para la evaluación.",
      "Informar oportunamente sobre plazos, notificaciones o actuaciones ya iniciadas.",
      "Aceptar previamente el alcance de cualquier revisión adicional que exceda la consulta inicial.",
    ],

    exclusions: [
      "Promesas o garantías sobre el resultado de procedimientos, procesos o negociaciones.",
      "Representación judicial, arbitral o administrativa sin aceptación expresa de un encargo independiente.",
      "Elaboración de escritos, contratos, informes o recursos que no hayan sido incluidos expresamente en el alcance acordado.",
      "Opiniones concluyentes cuando la información o documentación disponible resulte insuficiente.",
      "Actuaciones frente a terceros o autoridades sin autorización y contratación previa.",
    ],

    modalities: [
      "Videoconferencia",
      "Atención presencial previa coordinación",
    ],

    availability: "available",
    availabilityLabel: "Disponible previa coordinación",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "professional",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "La orientación se formula con base en la información y documentación disponibles al momento de la evaluación. La asesoría no constituye promesa de resultado ni implica automáticamente patrocinio, representación o ejecución de actuaciones posteriores.",

    published: false,
  },
  {
  id: "SRV-BUHODOC-001",
  slug: "buhodoc",
  title: "BúhoDoc",
  category: "buhodoc",

  summary:
    "Revisión, adecuación o elaboración de documentos jurídicos y corporativos.",

  description:
    "Servicio especializado de revisión, adecuación y elaboración de documentos jurídicos y corporativos, orientado a producir instrumentos coherentes con los antecedentes, la finalidad perseguida y las formalidades aplicables. El alcance concreto se determina después de evaluar la documentación y complejidad del encargo.",

  detailImage: {
    src: "/services/details/buhodoc.webp",
    alt: "Profesional revisando y redactando documentación jurídica durante una sesión de trabajo.",
  },

  publicTagline:
    "Central de Redacción Inteligente Premium",

  targetAudience: [
    "Personas que necesitan preparar, revisar o responder un documento jurídico antes de presentarlo o utilizarlo.",
    "Profesionales independientes que requieren formalizar acuerdos, requerimientos, solicitudes o posiciones jurídicas.",
    "Abogados que necesitan apoyo especializado para estructurar, revisar o fortalecer documentos jurídicos complejos.",
    "Empresas y organizaciones que requieren contratos, actas, convenios, informes u otros instrumentos adaptados a una operación concreta.",
    "Administrados, funcionarios, servidores y proveedores que necesitan preparar actuaciones frente a entidades públicas.",
    "Personas involucradas en procesos judiciales, investigaciones, procedimientos administrativos o controversias que requieren una actuación escrita técnicamente estructurada.",
  ],

  scope: [
    "Comprensión del objetivo jurídico y del resultado que se busca alcanzar mediante el documento.",
    "Revisión de hechos, antecedentes, documentos disponibles y plazos relevantes.",
    "Identificación de la vía, estrategia documental y estructura más adecuada para el caso.",
    "Redacción, revisión o adecuación jurídica conforme al alcance aprobado.",
    "Control de coherencia entre hechos, fundamentos, petición, anexos y finalidad del documento.",
    "Revisión final antes de la entrega para detectar contradicciones, omisiones o riesgos previsibles.",
  ],

  exclusions: [
    "Reproducción automática de modelos o plantillas sin análisis del caso concreto.",
    "Emisión de conclusiones definitivas cuando la información o documentación disponible resulte insuficiente.",
    "Presentación, patrocinio, representación o seguimiento del procedimiento cuando dichas actuaciones no hayan sido contratadas expresamente.",
    "Garantía de admisión, procedencia, estimación, acogimiento o resultado favorable de escritos, solicitudes o recursos.",
    "Incorporación de hechos, documentos o afirmaciones cuya veracidad o procedencia no pueda ser razonablemente sustentada por el cliente.",
  ],

  modalities: [
    "Evaluación documental previa",
  ],

  availability: "evaluation_required",
  availabilityLabel: "Evaluación previa",

  pricingMode: "quote_required",
  price: null,
  currency: null,

  requiresConflictCheck: false,
  requiresEvaluation: true,
  allowsImmediatePayment: false,

  responsible: null,

  ctaLabel: "Solicitar evaluación",
  status: "active",

  warning: null,

  stages: [
    "Delimitación del objetivo y resultado esperado",
    "Recepción y revisión de antecedentes y documentos",
    "Evaluación jurídica y definición de estrategia documental",
    "Redacción, revisión o adecuación del documento",
    "Control de coherencia jurídica, probatoria y formal",
    "Entrega y coordinación de siguientes actuaciones cuando correspondan",
  ],

  subOffers: [
    /*
     * =========================================================
     * ACTUACIONES JUDICIALES — INICIO Y DEFENSA
     * =========================================================
     */

    {
      title: "Demanda judicial",

      description:
        "Preparación jurídica de una demanda a partir de los hechos, documentos disponibles, pretensión perseguida y requisitos procesales aplicables.",

      usefulWhen: [
        "Se necesita iniciar judicialmente una pretensión y todavía debe definirse su adecuada formulación.",
        "Existen hechos y documentación que requieren ser ordenados antes de plantear el petitorio.",
        "Es necesario evaluar competencia, legitimidad, vía procedimental, pretensiones y medios probatorios antes de presentar el caso.",
      ],

      reviewBeforeAssuming: [
        "Hechos relevantes y secuencia cronológica.",
        "Legitimidad e interés para obrar.",
        "Competencia y vía procedimental.",
        "Plazos de prescripción o caducidad.",
        "Documentación y medios probatorios disponibles.",
        "Viabilidad de las pretensiones que se pretende formular.",
      ],

      workMayInclude: [
        "Construcción de la teoría del caso.",
        "Definición de pretensiones principales y accesorias.",
        "Fundamentación fáctica y jurídica.",
        "Organización de medios probatorios y anexos.",
        "Revisión de requisitos procesales antes de presentación.",
      ],

      notice:
        "La evaluación previa permite determinar si corresponde presentar una demanda, reformular la estrategia o realizar antes alguna actuación adicional.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Contestación de demanda",

      description:
        "Preparación de la respuesta procesal frente a una demanda notificada, priorizando defensas que puedan condicionar el proceso antes de ingresar al fondo de la controversia.",

      usefulWhen: [
        "Se ha recibido una demanda judicial y existe un plazo para contestarla.",
        "Es necesario evaluar defensas procesales, excepciones, contradicciones fácticas o argumentos de fondo.",
        "La documentación de la parte demandada debe ser organizada estratégicamente antes de formular la defensa.",
      ],

      reviewBeforeAssuming: [
        "Fecha y forma de notificación.",
        "Plazo procesal disponible.",
        "Petitorio y causa de pedir de la demanda.",
        "Legitimidad, competencia y presupuestos procesales.",
        "Posibles excepciones, defensas previas o cuestiones probatorias.",
        "Documentos y antecedentes de la parte demandada.",
      ],

      workMayInclude: [
        "Definición de estrategia procesal.",
        "Contestación de hechos y fundamentos jurídicos.",
        "Planteamiento de defensas procesales cuando correspondan.",
        "Ofrecimiento y organización de medios probatorios.",
        "Control final de coherencia entre defensa, anexos y petitorio.",
      ],

      notice:
        "La existencia de una demanda no significa que toda defensa deba concentrarse únicamente en contestar el fondo; primero se examinan las alternativas procesales disponibles.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Excepciones y defensas procesales",

      description:
        "Evaluación y elaboración de mecanismos destinados a cuestionar presupuestos procesales o condiciones de la acción cuando jurídicamente corresponda hacerlo.",

      usefulWhen: [
        "La demanda podría presentar problemas de competencia, legitimidad, caducidad, prescripción u otros presupuestos procesales.",
        "Existe una cuestión previa que podría impedir o modificar la continuación ordinaria del proceso.",
      ],

      reviewBeforeAssuming: [
        "Naturaleza exacta de la pretensión demandada.",
        "Norma procesal aplicable.",
        "Fechas relevantes y actos previos.",
        "Relación jurídica entre las partes.",
        "Documentación necesaria para sustentar la defensa.",
      ],

      workMayInclude: [
        "Identificación de la defensa procesal jurídicamente pertinente.",
        "Construcción del fundamento fáctico y jurídico.",
        "Selección de documentos y medios de prueba.",
        "Delimitación precisa del efecto procesal solicitado.",
      ],

      notice:
        "No toda observación a una demanda configura una excepción. La estrategia se define después de comprobar que el mecanismo procesal elegido corresponde realmente al caso.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Denuncia penal",

      description:
        "Evaluación y elaboración de una denuncia penal a partir de hechos que podrían tener relevancia delictiva, organizando cronológicamente los acontecimientos, identificando a los intervinientes, delimitando la imputación y relacionando los elementos disponibles que permitan sustentar razonablemente la intervención del Ministerio Público.",

      usefulWhen: [
        "Una persona o empresa considera haber sido víctima de hechos que podrían constituir delito.",
        "Existen documentos, comunicaciones, operaciones, registros u otros elementos que requieren ser ordenados antes de acudir al Ministerio Público.",
        "Es necesario diferenciar hechos penalmente relevantes de controversias exclusivamente civiles, comerciales, administrativas o societarias.",
        "Se requiere presentar los hechos de manera clara para facilitar su comprensión e investigación.",
        "Existen varias personas, actos o momentos relevantes y es necesario individualizar correctamente la participación atribuida a cada interviniente.",
      ],

      reviewBeforeAssuming: [
        "Relato completo y cronología de los hechos.",
        "Identificación del denunciante, agraviado y personas presuntamente involucradas.",
        "Documentación y demás elementos disponibles.",
        "Origen y contexto de la controversia.",
        "Existencia de procesos judiciales, administrativos, arbitrales o societarios vinculados.",
        "Posible relevancia penal de los hechos relatados.",
        "Correspondencia preliminar entre los hechos y las figuras delictivas que podrían resultar aplicables.",
        "Elementos que permitan individualizar conductas y responsabilidades.",
        "Lugar y momento de realización de los hechos.",
        "Existencia de diligencias urgentes o elementos susceptibles de pérdida, alteración o desaparición.",
        "Riesgo de formular afirmaciones que no puedan ser razonablemente sustentadas.",
      ],

      workMayInclude: [
        "Entrevista y reconstrucción cronológica de los hechos.",
        "Separación de hechos principales, antecedentes y consecuencias.",
        "Identificación de personas y conductas relevantes.",
        "Análisis jurídico preliminar de la posible relevancia penal.",
        "Individualización de la conducta atribuida a cada persona cuando resulte posible.",
        "Organización de documentos y demás elementos disponibles.",
        "Identificación de diligencias iniciales que podrían contribuir al esclarecimiento de los hechos.",
        "Estructuración del relato de la denuncia.",
        "Fundamentación jurídica correspondiente al alcance contratado.",
        "Preparación y ordenamiento de anexos.",
        "Control final de coherencia entre hechos, imputación y elementos aportados.",
      ],

      notice:
        "La denuncia penal no debe utilizarse únicamente como mecanismo de presión frente a una controversia de otra naturaleza. La evaluación previa busca determinar si los hechos presentan relevancia penal suficiente y cómo exponerlos de manera objetiva, individualizada y respaldada por los elementos disponibles.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "senior",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Absolución y control del requerimiento de acusación",

      description:
        "Evaluación integral del requerimiento de acusación fiscal y preparación de la respuesta defensiva correspondiente durante la etapa intermedia, identificando defectos formales, problemas de imputación, medios de defensa, posibilidades de sobreseimiento, cuestiones probatorias y demás planteamientos que puedan formularse antes del juicio oral.",

      usefulWhen: [
        "El Ministerio Público ha presentado requerimiento de acusación contra el investigado.",
        "La acusación ha sido notificada y corresponde ejercer defensa dentro del plazo procesal.",
        "Es necesario verificar si los hechos acusados coinciden con el objeto de la investigación preparatoria.",
        "Existen defectos formales, problemas de imputación o inconsistencias que deben ser cuestionados.",
        "La defensa considera que podrían concurrir fundamentos para solicitar sobreseimiento.",
        "Es necesario definir los medios de prueba que serán ofrecidos para un eventual juicio oral.",
        "Existen excepciones, cuestiones previas u otros medios de defensa pendientes de planteamiento.",
      ],

      reviewBeforeAssuming: [
        "Requerimiento de acusación fiscal completo.",
        "Disposición de formalización y continuación de la investigación preparatoria.",
        "Hechos atribuidos inicialmente y hechos finalmente acusados.",
        "Calificación jurídica propuesta por el Ministerio Público.",
        "Participación atribuida al imputado.",
        "Elementos de convicción utilizados para sustentar la acusación.",
        "Pena y reparación civil solicitadas.",
        "Medios de prueba ofrecidos por la Fiscalía.",
        "Actuaciones relevantes desarrolladas durante la investigación.",
        "Notificación del requerimiento y plazo disponible para responder.",
        "Existencia de excepciones, cuestiones previas o medios de defensa todavía viables.",
        "Posibles causales de sobreseimiento.",
        "Medios de prueba que la defensa podría ofrecer para juicio.",
      ],

      workMayInclude: [
        "Auditoría formal del requerimiento de acusación.",
        "Comparación entre la formalización de investigación y los hechos finalmente acusados.",
        "Control de claridad, precisión e individualización de la imputación.",
        "Análisis de correspondencia entre hechos, participación atribuida y calificación jurídica.",
        "Revisión crítica de los elementos de convicción invocados por la Fiscalía.",
        "Identificación de defectos formales susceptibles de observación.",
        "Evaluación de excepciones y otros medios técnicos de defensa.",
        "Evaluación de causales que puedan sustentar una solicitud de sobreseimiento.",
        "Revisión de medidas de coerción vinculadas al proceso cuando corresponda.",
        "Selección y ofrecimiento de medios de prueba para juicio.",
        "Formulación de observaciones y pedidos concretos para la etapa intermedia.",
        "Preparación de la estrategia para la audiencia de control de acusación.",
      ],

      notice:
        "La respuesta al requerimiento de acusación no debe reducirse a negar los hechos. La etapa intermedia permite realizar un control formal y sustancial de la acusación y definir qué cuestiones deben resolverse antes de que el proceso avance a juicio oral.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "senior",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    /*
     * =========================================================
     * RECURSOS JUDICIALES
     * =========================================================
     */

    {
      title: "Recurso de Reposición",

      description:
        "Evaluación y elaboración del recurso dirigido a solicitar que el propio órgano jurisdiccional reexamine una decisión cuando el ordenamiento permite esta vía.",

      usefulWhen: [
        "Se ha emitido una resolución susceptible de reposición.",
        "Existe un agravio concreto que puede ser planteado ante el mismo órgano que expidió la decisión.",
      ],

      reviewBeforeAssuming: [
        "Tipo de resolución emitida.",
        "Fecha de notificación y plazo disponible.",
        "Procedencia legal del recurso.",
        "Agravio concreto que se pretende corregir.",
      ],

      workMayInclude: [
        "Identificación precisa del error cuestionado.",
        "Fundamentación del agravio.",
        "Formulación del pedido de reconsideración judicial correspondiente.",
      ],

      notice:
        "Antes de redactar se verifica que la reposición sea la vía adecuada y que no corresponda otro mecanismo impugnatorio.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Apelación de Auto",

      description:
        "Análisis y formulación de agravios frente a una resolución judicial interlocutoria que afecte los intereses procesales de la parte.",

      usefulWhen: [
        "Un auto judicial produce un perjuicio procesal susceptible de revisión superior.",
        "Se necesita cuestionar la interpretación jurídica, valoración realizada o consecuencia procesal de una resolución.",
      ],

      reviewBeforeAssuming: [
        "Resolución impugnada.",
        "Fecha de notificación.",
        "Procedencia y plazo del recurso.",
        "Agravios jurídicamente relevantes.",
        "Antecedentes procesales vinculados con la decisión.",
      ],

      workMayInclude: [
        "Identificación y jerarquización de agravios.",
        "Análisis normativo y jurisprudencial cuando resulte necesario.",
        "Desarrollo de la pretensión impugnatoria.",
        "Control de congruencia entre agravio y pedido.",
      ],

      notice:
        "La apelación se construye sobre agravios concretos derivados de la resolución; no consiste únicamente en expresar desacuerdo con la decisión.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Apelación de Sentencia",

      description:
        "Revisión estratégica de una sentencia para determinar los agravios que justifican solicitar su examen por el órgano jurisdiccional superior.",

      usefulWhen: [
        "Una sentencia contiene conclusiones que perjudican total o parcialmente la posición procesal del cliente.",
        "Se requiere analizar posibles errores de hecho, valoración probatoria, motivación o interpretación jurídica.",
      ],

      reviewBeforeAssuming: [
        "Sentencia completa y fecha de notificación.",
        "Demanda, contestación y principales actuaciones procesales.",
        "Medios probatorios incorporados al proceso.",
        "Fundamentos utilizados por el juzgado.",
        "Agravios con capacidad real de revisión en segunda instancia.",
      ],

      workMayInclude: [
        "Auditoría de la sentencia.",
        "Identificación y ordenamiento de agravios.",
        "Contraste con los actuados relevantes.",
        "Fundamentación jurídica del recurso.",
        "Definición precisa de la decisión que se solicita al superior.",
      ],

      notice:
        "La evaluación busca concentrar el recurso en agravios jurídicamente defendibles y evitar reproducir argumentos que no respondan a los fundamentos de la sentencia.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Recurso de Casación",

      description:
        "Evaluación extraordinaria destinada a determinar si la resolución reúne condiciones para formular un recurso de casación conforme a las causales, requisitos y finalidad previstos por la legislación aplicable.",

      usefulWhen: [
        "Existe una resolución de segunda instancia y se necesita determinar si procede una impugnación extraordinaria.",
        "Se advierte una posible infracción normativa, problema de motivación u otra causal jurídicamente relevante.",
      ],

      reviewBeforeAssuming: [
        "Resolución de segunda instancia.",
        "Resoluciones precedentes relevantes.",
        "Materia y cuantía cuando sean jurídicamente determinantes.",
        "Causales legalmente disponibles.",
        "Requisitos de procedencia y admisibilidad.",
        "Capacidad del caso para superar el control formal y material del recurso.",
      ],

      workMayInclude: [
        "Auditoría integral de procedencia.",
        "Identificación de causal o causales defendibles.",
        "Construcción de infracciones normativas o procesales.",
        "Desarrollo de incidencia directa sobre la decisión impugnada.",
        "Control técnico de requisitos extraordinarios.",
      ],

      notice:
        "La evaluación senior previa busca determinar primero si existe una vía casatoria jurídicamente defendible. Si la revisión concluye que otra estrategia protege mejor la posición del cliente, se explica antes de asumir la redacción.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "senior",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Recurso de Queja",

      description:
        "Evaluación y formulación del mecanismo destinado a cuestionar la denegatoria o concesión irregular de un recurso cuando la legislación procesal contempla esta vía.",

      usefulWhen: [
        "Un recurso ha sido declarado improcedente o no concedido y existe una vía legal para cuestionar esa decisión.",
        "Se necesita revisar si la denegatoria respetó las reglas procesales aplicables.",
      ],

      reviewBeforeAssuming: [
        "Recurso originalmente presentado.",
        "Resolución que lo deniega o concede irregularmente.",
        "Fecha de notificación.",
        "Normas de procedencia aplicables.",
      ],

      workMayInclude: [
        "Revisión de la denegatoria.",
        "Identificación del error procesal.",
        "Fundamentación del derecho a revisión cuando corresponda.",
      ],

      notice:
        "Antes de preparar el recurso se verifica la procedencia de la queja, la resolución cuestionada y los requisitos exigidos por la legislación procesal aplicable.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    /*
     * =========================================================
     * ACTUACIONES ADMINISTRATIVAS
     * =========================================================
     */

    {
      title: "Solicitud administrativa",

      description:
        "Preparación de solicitudes dirigidas a entidades públicas para iniciar, impulsar o encauzar un procedimiento administrativo, estructurando adecuadamente el pedido, los fundamentos, los antecedentes y la documentación necesaria para sustentar la actuación solicitada.",

      usefulWhen: [
        "Se necesita iniciar un procedimiento o formular una petición ante una entidad pública.",
        "El administrado requiere solicitar reconocimiento, autorización, inscripción, regularización, devolución, pronunciamiento o cualquier otra actuación administrativa prevista por el ordenamiento.",
        "Existen antecedentes o documentos que deben ser organizados antes de presentar la solicitud.",
        "Es necesario definir con precisión qué se solicita, ante qué autoridad y bajo qué procedimiento.",
        "La petición inicial debe dejar adecuadamente delimitado el objeto del trámite para evitar observaciones o interpretaciones desfavorables.",
      ],

      reviewBeforeAssuming: [
        "Entidad y órgano administrativo ante el cual debe presentarse la solicitud.",
        "Objeto concreto que pretende alcanzar el administrado.",
        "Procedimiento administrativo aplicable.",
        "Normativa sustantiva y procedimental relevante.",
        "Requisitos establecidos por ley, reglamento, TUPA u otra regulación aplicable.",
        "Competencia de la autoridad que deberá tramitar o resolver.",
        "Antecedentes administrativos existentes.",
        "Documentación disponible para sustentar la petición.",
        "Plazos, condiciones previas o actuaciones anteriores que puedan afectar el trámite.",
        "Existencia de procedimientos paralelos, solicitudes previas o decisiones administrativas relacionadas.",
      ],

      workMayInclude: [
        "Definición precisa del petitorio administrativo.",
        "Organización cronológica de los antecedentes relevantes.",
        "Fundamentación fáctica y jurídica de la solicitud.",
        "Identificación de la autoridad competente.",
        "Revisión de requisitos formales y documentales aplicables.",
        "Estructuración de los argumentos principales y subsidiarios cuando corresponda.",
        "Organización de documentos y anexos.",
        "Delimitación de solicitudes accesorias o complementarias.",
        "Revisión de coherencia entre hechos, fundamento jurídico, documentación y petitorio.",
        "Control final previo a la presentación.",
      ],

      notice:
        "Una solicitud administrativa bien estructurada permite definir desde el inicio qué se pide, por qué corresponde y qué documentación lo sustenta. La evaluación previa busca reducir observaciones evitables y encauzar el trámite por la vía administrativa adecuada.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Descargos administrativos",

      description:
        "Preparación de una respuesta técnica y jurídica frente a observaciones, imputaciones, requerimientos o cargos formulados por una entidad administrativa.",

      usefulWhen: [
        "La entidad ha requerido información o formulado observaciones.",
        "Se ha iniciado una actuación fiscalizadora o procedimiento administrativo.",
        "Existe un plazo para explicar hechos, aportar documentación o controvertir una imputación.",
      ],

      reviewBeforeAssuming: [
        "Documento que origina el requerimiento o imputación.",
        "Fecha de notificación y plazo.",
        "Hechos atribuidos.",
        "Normativa invocada por la entidad.",
        "Documentos y contraexplicaciones disponibles.",
      ],

      workMayInclude: [
        "Reconstrucción de antecedentes.",
        "Respuesta ordenada a cada imputación u observación.",
        "Fundamentación normativa.",
        "Organización de documentos de sustento.",
        "Formulación concreta del pedido administrativo.",
      ],

      notice:
        "La respuesta se estructura según el contenido real del requerimiento, observación o imputación y la información disponible para sustentar cada explicación o contradicción.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Descargos en procedimiento administrativo sancionador",

      description:
        "Evaluación y elaboración de la defensa escrita frente a una imputación formulada dentro de un procedimiento administrativo sancionador, analizando los hechos atribuidos, la tipificación invocada, la prueba disponible y los presupuestos jurídicos necesarios para la imposición de una sanción.",

      usefulWhen: [
        "La entidad ha notificado una imputación de cargos o acto equivalente dentro de un procedimiento administrativo sancionador.",
        "Se atribuye al administrado la comisión de una infracción administrativa y existe un plazo para ejercer el derecho de defensa.",
        "Es necesario controvertir hechos, tipificación, responsabilidad, culpabilidad, causalidad o prueba utilizada por la administración.",
        "La imputación podría generar multa, inhabilitación, suspensión, cierre, pérdida de derechos u otra consecuencia sancionadora.",
      ],

      reviewBeforeAssuming: [
        "Acto de inicio, imputación de cargos o documento que formaliza el procedimiento sancionador.",
        "Fecha y forma de notificación y plazo disponible para presentar los descargos.",
        "Identificación precisa de cada hecho imputado y de la infracción atribuida.",
        "Norma sustantiva y procedimiento sancionador aplicable.",
        "Documentos, informes, actas, fotografías, registros, comunicaciones u otros elementos utilizados como sustento de la imputación.",
        "Documentación y elementos de descargo disponibles.",
        "Competencia de la autoridad instructora y de la autoridad sancionadora.",
        "Existencia de antecedentes, actuaciones previas, fiscalizaciones o requerimientos vinculados con el caso.",
      ],

      workMayInclude: [
        "Reconstrucción cronológica de los hechos relevantes.",
        "Individualización de cada cargo formulado por la administración.",
        "Análisis de tipicidad y correspondencia entre los hechos atribuidos y la infracción invocada.",
        "Evaluación de causalidad, culpabilidad, responsabilidad personal y demás presupuestos sancionadores aplicables.",
        "Revisión de prescripción, caducidad, competencia, debido procedimiento y otras garantías administrativas cuando resulten pertinentes.",
        "Contraste de los elementos de cargo con la documentación y demás elementos de descargo.",
        "Construcción de contraexplicaciones y argumentos alternativos frente a las inferencias de la entidad.",
        "Desarrollo ordenado de la defensa respecto de cada imputación.",
        "Organización y referencia de documentos, anexos y medios probatorios.",
        "Formulación concreta del petitorio que corresponda conforme al estado del procedimiento.",
      ],

      notice:
        "La existencia de una imputación administrativa no determina por sí sola responsabilidad. La defensa se construye verificando primero los hechos atribuidos, la tipificación invocada, la prueba disponible, la relación causal, la responsabilidad personal y las garantías aplicables al procedimiento sancionador.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Recurso de Reconsideración",

      description:
        "Evaluación y elaboración del recurso administrativo dirigido a solicitar que la propia autoridad reexamine una decisión, cuando el procedimiento aplicable permita esta vía y existan elementos jurídicos o probatorios que justifiquen una nueva revisión.",

      usefulWhen: [
        "Existe una resolución administrativa adversa y el ordenamiento permite solicitar su reconsideración.",
        "Han aparecido nuevos elementos, documentos o medios probatorios que pueden influir en la decisión.",
        "La autoridad podría haber omitido valorar información relevante ya incorporada al expediente.",
        "Es necesario cuestionar una decisión antes de acudir a una instancia administrativa superior.",
      ],

      reviewBeforeAssuming: [
        "Resolución o acto administrativo cuestionado.",
        "Fecha y forma de notificación.",
        "Plazo disponible para interponer el recurso.",
        "Norma especial y procedimiento administrativo aplicable.",
        "Procedencia de la reconsideración en el caso concreto.",
        "Existencia de nueva prueba o del presupuesto exigido por la normativa aplicable.",
        "Expediente, antecedentes y actuaciones administrativas relevantes.",
        "Objetivo concreto que se pretende alcanzar con el recurso.",
      ],

      workMayInclude: [
        "Análisis de procedencia y admisibilidad del recurso.",
        "Identificación de los extremos de la decisión que deben ser cuestionados.",
        "Evaluación e integración de nueva prueba cuando resulte exigible o conveniente.",
        "Construcción de agravios administrativos y fundamentos jurídicos.",
        "Revisión de motivación, valoración probatoria y aplicación normativa.",
        "Formulación del pedido concreto de reconsideración.",
        "Organización de anexos y documentos de sustento.",
        "Control final de coherencia entre hechos, fundamentos, prueba y petitorio.",
      ],

      notice:
        "La reconsideración no consiste únicamente en reiterar argumentos ya expuestos. La evaluación previa busca determinar si existen elementos jurídicos o probatorios que permitan solicitar razonablemente un nuevo examen de la decisión.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Recurso de Apelación Administrativa",

      description:
        "Preparación del recurso destinado a que el superior jerárquico revise una decisión administrativa que afecta los derechos o intereses del administrado, desarrollando de manera ordenada los agravios fácticos, jurídicos y probatorios que sustentan la impugnación.",

      usefulWhen: [
        "Existe una resolución administrativa adversa susceptible de apelación.",
        "Se cuestiona la interpretación o aplicación de una norma realizada por la entidad.",
        "Existen errores en la valoración de los hechos o de la prueba.",
        "La decisión presenta problemas de motivación, congruencia, competencia o debido procedimiento.",
        "Es necesario solicitar que una instancia administrativa superior revise total o parcialmente lo resuelto.",
      ],

      reviewBeforeAssuming: [
        "Resolución administrativa que se pretende impugnar.",
        "Fecha y forma de notificación.",
        "Plazo disponible para apelar.",
        "Autoridad que emitió la decisión y órgano competente para resolver la apelación.",
        "Expediente o antecedentes administrativos relevantes.",
        "Fundamentos utilizados por la entidad para adoptar la decisión.",
        "Prueba incorporada al procedimiento y forma en que fue valorada.",
        "Agravios concretos que la decisión genera al administrado.",
        "Existencia de normas especiales que regulen requisitos adicionales del recurso.",
      ],

      workMayInclude: [
        "Identificación y jerarquización de agravios administrativos.",
        "Revisión de legalidad, competencia, motivación y debido procedimiento.",
        "Análisis de los hechos relevantes y de la valoración probatoria efectuada por la entidad.",
        "Contraste entre la decisión impugnada y la normativa aplicable.",
        "Desarrollo de argumentos de hecho y de derecho.",
        "Definición precisa del pedido dirigido al superior jerárquico.",
        "Organización de antecedentes, documentos y anexos.",
        "Control final de congruencia entre agravios, fundamentos y petitorio.",
      ],

      notice:
        "Una apelación eficaz no se limita a expresar desacuerdo con la decisión. La revisión previa permite identificar qué errores pueden ser jurídicamente cuestionados y concentrar el recurso en los agravios con verdadera capacidad de revisión por la autoridad superior.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    /*
     * =========================================================
     * DOCUMENTOS JURÍDICOS Y ESTRATÉGICOS
     * =========================================================
     */

    {
      title: "Carta Notarial",

      description:
        "Redacción estratégica de comunicaciones formales destinadas a requerir, responder, dejar constancia, delimitar una posición jurídica, solicitar el cumplimiento de una obligación o preparar una actuación posterior, considerando no solo el contenido legal sino también los efectos que la comunicación puede producir frente al destinatario.",

      usefulWhen: [
        "Es necesario efectuar un requerimiento formal antes de adoptar otras medidas.",
        "Se necesita responder una comunicación, imputación, requerimiento o posición de otra persona o entidad.",
        "Conviene dejar constancia documentada de determinados hechos, acuerdos, incumplimientos o comunicaciones previas.",
        "Se busca exigir el cumplimiento de una obligación o fijar un plazo para determinada conducta.",
        "Es necesario preservar una posición jurídica antes de iniciar una negociación, conciliación, arbitraje, procedimiento administrativo o proceso judicial.",
        "La forma en que se redacte la comunicación puede influir en la reacción, decisión o conducta futura del destinatario.",
      ],

      reviewBeforeAssuming: [
        "Objetivo concreto de la comunicación.",
        "Identidad y posición jurídica del remitente y del destinatario.",
        "Antecedentes relevantes entre las partes.",
        "Documentos, contratos, mensajes o comunicaciones existentes.",
        "Obligaciones o hechos que originan el requerimiento o respuesta.",
        "Plazos contractuales, legales o convenidos.",
        "Consecuencias jurídicas previsibles del contenido que se pretende comunicar.",
        "Posibles admisiones, reconocimientos o afirmaciones que podrían perjudicar posteriormente al remitente.",
        "Necesidad de conservar una posición para una futura negociación, conciliación, arbitraje, procedimiento o proceso judicial.",
        "Respuesta o comportamiento que razonablemente se pretende provocar en el destinatario.",
      ],

      workMayInclude: [
        "Definición de la estrategia comunicacional y jurídica.",
        "Determinación del tono adecuado según la relación entre las partes.",
        "Redacción del requerimiento, respuesta, emplazamiento o comunicación formal.",
        "Ordenamiento cronológico de los antecedentes relevantes.",
        "Identificación de obligaciones y hechos jurídicamente relevantes.",
        "Delimitación precisa de aquello que se solicita o comunica.",
        "Incorporación de plazos o condiciones cuando corresponda.",
        "Control del lenguaje para evitar admisiones, reconocimientos o afirmaciones innecesarias.",
        "Reserva de derechos y acciones cuando resulte conveniente.",
        "Preparación del contenido pensando en una eventual utilización posterior como antecedente documental.",
      ],

      notice:
        "La carta notarial no se redacta únicamente para comunicar una posición. Su contenido puede generar efectos posteriores, por lo que se evalúan previamente los antecedentes, la finalidad perseguida y la reacción que razonablemente puede producir en el destinatario.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Contrato o adenda",

      description:
        "Revisión, adecuación o elaboración de contratos y adendas conforme a la operación concreta, la distribución de obligaciones entre las partes, los riesgos previsibles y los mecanismos de cumplimiento, modificación, resolución y solución de controversias.",

      usefulWhen: [
        "Las partes necesitan documentar jurídicamente una operación, relación comercial o prestación de servicios.",
        "Un contrato existente requiere modificación, precisión, ampliación, prórroga o actualización.",
        "Es necesario ordenar obligaciones, plazos, prestaciones, contraprestaciones y responsabilidades antes de firmar.",
        "Se requiere identificar riesgos previsibles antes de asumir una obligación contractual.",
        "Existen condiciones ya negociadas que deben convertirse en cláusulas jurídicamente coherentes.",
        "La relación contractual requiere mecanismos claros frente a incumplimientos, modificaciones o controversias.",
      ],

      reviewBeforeAssuming: [
        "Objeto real de la operación.",
        "Identidad, capacidad y posición de cada parte.",
        "Obligaciones principales y accesorias.",
        "Prestaciones, contraprestaciones y condiciones económicas.",
        "Plazos, hitos, entregables y condiciones de cumplimiento.",
        "Antecedentes, acuerdos previos o comunicaciones relevantes.",
        "Riesgos previsibles de ejecución o incumplimiento.",
        "Garantías, penalidades, retenciones o mecanismos de aseguramiento cuando correspondan.",
        "Causales de modificación, suspensión, resolución o terminación.",
        "Mecanismos de solución de controversias.",
        "Normativa aplicable y formalidades necesarias.",
        "Coherencia entre la operación real y la estructura documental propuesta.",
      ],

      workMayInclude: [
        "Definición de la estructura contractual.",
        "Redacción o revisión de cláusulas.",
        "Ordenamiento de derechos y obligaciones.",
        "Definición de plazos, hitos y condiciones.",
        "Identificación y tratamiento de contingencias previsibles.",
        "Incorporación de mecanismos de cumplimiento.",
        "Regulación de penalidades, garantías o consecuencias de incumplimiento.",
        "Definición de mecanismos de modificación, suspensión o terminación.",
        "Revisión del sistema de solución de controversias.",
        "Adecuación de anexos, cuadros, cronogramas o documentos vinculados.",
        "Control final de coherencia entre cláusulas y operación económica.",
      ],

      notice:
        "Un contrato no debe limitarse a reproducir acuerdos verbales o modelos preexistentes. La revisión busca que el documento refleje correctamente la operación, distribuya riesgos de manera consciente y reduzca ambigüedades que puedan generar conflictos posteriores.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Acta de acuerdos",

      description:
        "Redacción o revisión de un documento destinado a dejar constancia ordenada de acuerdos, compromisos, decisiones, obligaciones o hechos relevantes asumidos por dos o más personas, empresas u organizaciones.",

      usefulWhen: [
        "Las partes han alcanzado acuerdos que necesitan quedar documentados de manera clara.",
        "Una reunión, negociación o coordinación ha producido compromisos que deben ser precisados por escrito.",
        "Es necesario establecer obligaciones, responsables, plazos o condiciones para evitar interpretaciones posteriores.",
        "Se desea dejar constancia de determinados hechos o declaraciones relevantes.",
        "Las partes necesitan documentar una solución alcanzada antes de celebrar un contrato más complejo.",
      ],

      reviewBeforeAssuming: [
        "Identidad y capacidad de las personas que suscribirán el documento.",
        "Finalidad concreta del acta.",
        "Antecedentes que explican el acuerdo alcanzado.",
        "Contenido exacto de los compromisos asumidos.",
        "Obligaciones que corresponden a cada parte.",
        "Plazos, condiciones o hitos de cumplimiento.",
        "Documentos o bienes involucrados.",
        "Consecuencias previstas frente al incumplimiento.",
        "Necesidad de garantías, penalidades o mecanismos adicionales.",
        "Relación del acta con contratos, procesos o documentos anteriores.",
        "Necesidad de firmas legalizadas, certificación notarial u otra formalidad.",
      ],

      workMayInclude: [
        "Ordenamiento jurídico de los acuerdos alcanzados.",
        "Identificación de las partes intervinientes.",
        "Redacción de antecedentes y contexto necesario.",
        "Definición precisa de obligaciones y compromisos.",
        "Determinación de plazos y condiciones.",
        "Regulación de mecanismos de cumplimiento.",
        "Incorporación de garantías o penalidades cuando corresponda.",
        "Definición de consecuencias frente al incumplimiento.",
        "Revisión de coherencia con documentos previos.",
        "Preparación del texto final para firma.",
      ],

      notice:
        "Un acta correctamente estructurada no solo deja constancia de una reunión; puede convertirse en un instrumento importante para acreditar acuerdos, obligaciones y compromisos posteriores. Por ello se revisa especialmente que su contenido sea claro y no genere obligaciones distintas de las realmente aceptadas.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Convenio",

      description:
        "Elaboración o revisión de acuerdos destinados a organizar una relación de colaboración, cooperación, prestación recíproca o coordinación entre personas, empresas, instituciones u organizaciones.",

      usefulWhen: [
        "Dos o más partes desean establecer una relación de cooperación o colaboración.",
        "Existen compromisos recíprocos que necesitan ser formalizados.",
        "Una organización necesita definir responsabilidades, aportes o actividades conjuntas.",
        "Se requiere documentar una coordinación institucional o empresarial.",
        "Las partes necesitan establecer reglas claras antes de iniciar actividades compartidas.",
      ],

      reviewBeforeAssuming: [
        "Finalidad real del convenio.",
        "Identificación y capacidad de las partes.",
        "Competencias o facultades de quienes suscribirán.",
        "Aportes, obligaciones o actividades asumidas por cada parte.",
        "Duración del convenio.",
        "Mecanismos de coordinación y seguimiento.",
        "Responsabilidades frente a terceros.",
        "Tratamiento de información o documentación compartida.",
        "Condiciones para modificación, renovación o terminación.",
        "Consecuencias frente al incumplimiento.",
        "Compatibilidad con contratos, normas o acuerdos preexistentes.",
      ],

      workMayInclude: [
        "Definición del objeto del convenio.",
        "Determinación de obligaciones de cada parte.",
        "Regulación de aportes y responsabilidades.",
        "Establecimiento de mecanismos de coordinación.",
        "Definición de vigencia y plazos.",
        "Incorporación de reglas de confidencialidad cuando corresponda.",
        "Definición de mecanismos de modificación o terminación.",
        "Regulación de solución de controversias.",
        "Revisión de coherencia jurídica integral.",
      ],

      notice:
        "El convenio debe reflejar una relación real de colaboración y distribuir correctamente las responsabilidades entre las partes. La evaluación previa evita utilizar fórmulas genéricas que puedan generar obligaciones imprecisas o incompatibles con la operación prevista.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Transacción extrajudicial",

      description:
        "Evaluación y elaboración de un acuerdo destinado a prevenir o resolver una controversia mediante concesiones recíprocas, delimitando con precisión las obligaciones asumidas y los efectos jurídicos del acuerdo.",

      usefulWhen: [
        "Existe una controversia que las partes desean resolver sin continuar o iniciar un proceso.",
        "Las partes han avanzado en una negociación y necesitan formalizar una solución.",
        "Se busca establecer un pago, entrega, cumplimiento, desistimiento o conducta concreta para cerrar una disputa.",
        "Existe interés en reducir costos, tiempo o incertidumbre derivados de un litigio.",
        "Las partes desean documentar de manera definitiva determinadas concesiones recíprocas.",
      ],

      reviewBeforeAssuming: [
        "Origen y naturaleza de la controversia.",
        "Pretensiones o posiciones de cada parte.",
        "Derechos y obligaciones actualmente discutidos.",
        "Documentación que sustenta las posiciones existentes.",
        "Procesos judiciales, arbitrales o administrativos en curso.",
        "Capacidad y representación de quienes suscribirán.",
        "Concesiones que realizará cada parte.",
        "Valor económico o jurídico de las obligaciones comprometidas.",
        "Forma y plazo de cumplimiento.",
        "Garantías necesarias para asegurar la ejecución.",
        "Consecuencias frente al incumplimiento.",
        "Efectos del acuerdo sobre procesos o reclamaciones existentes.",
        "Necesidad de homologación, legalización u otras formalidades.",
      ],

      workMayInclude: [
        "Reconstrucción de antecedentes de la controversia.",
        "Identificación de riesgos y posiciones negociables.",
        "Definición de las concesiones recíprocas.",
        "Redacción de obligaciones concretas.",
        "Establecimiento de cronogramas de cumplimiento.",
        "Incorporación de garantías o penalidades.",
        "Definición de efectos sobre reclamaciones existentes.",
        "Regulación de desistimientos cuando jurídicamente corresponda.",
        "Definición de consecuencias frente al incumplimiento.",
        "Control final de ejecutabilidad y coherencia jurídica.",
      ],

      notice:
        "La transacción busca convertir una controversia en un acuerdo jurídicamente ejecutable. Antes de redactarla se revisa que las concesiones sean claras, que el acuerdo no genere obligaciones imprevistas y que la solución obtenida proteja adecuadamente la posición del cliente.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "senior",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Acuerdo de pago",

      description:
        "Elaboración o revisión de un acuerdo destinado a ordenar el cumplimiento de una obligación pendiente mediante cuotas, fechas, condiciones y mecanismos claros de seguimiento, procurando que ambas partes conozcan con precisión qué debe cumplirse y qué ocurrirá ante un eventual incumplimiento.",

      usefulWhen: [
        "Existe una deuda u obligación pendiente y las partes han decidido establecer una forma concreta de pago.",
        "El deudor necesita fraccionar el cumplimiento y el acreedor desea documentar adecuadamente las condiciones aceptadas.",
        "Se busca evitar que un acuerdo verbal genere nuevas discusiones sobre montos, fechas o condiciones.",
        "Las partes desean prevenir un proceso judicial mediante un cronograma de cumplimiento verificable.",
        "Existe una negociación avanzada y se necesita convertirla en un documento jurídicamente ordenado.",
      ],

      reviewBeforeAssuming: [
        "Origen y naturaleza de la obligación.",
        "Monto total actualmente reconocido o discutido.",
        "Documentos que acreditan la obligación.",
        "Pagos ya efectuados y saldo pendiente.",
        "Capacidad y representación de las partes.",
        "Número de cuotas y fechas propuestas.",
        "Forma y medio de pago.",
        "Intereses, penalidades o costos adicionales previamente acordados, cuando correspondan.",
        "Garantías disponibles.",
        "Consecuencias que las partes desean establecer frente al incumplimiento.",
        "Existencia de procesos judiciales, conciliaciones u otras actuaciones relacionadas.",
      ],

      workMayInclude: [
        "Determinación del saldo y obligación objeto del acuerdo.",
        "Diseño del cronograma de pagos.",
        "Definición de montos, fechas y medios de cumplimiento.",
        "Regulación de pagos parciales y constancias.",
        "Incorporación de cláusulas frente a mora o incumplimiento.",
        "Definición de vencimiento anticipado cuando resulte jurídicamente adecuado.",
        "Regulación de garantías cuando hayan sido acordadas.",
        "Definición del tratamiento de procesos o reclamaciones existentes.",
        "Preparación de anexos o cronogramas.",
        "Control final de claridad y ejecutabilidad del acuerdo.",
      ],

      notice:
        "Un acuerdo de pago útil debe evitar que el problema simplemente se traslade al futuro. Por ello se procura dejar claramente definidos el saldo, las fechas, el modo de cumplimiento y las consecuencias previamente aceptadas para un eventual incumplimiento.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Reconocimiento de deuda",

      description:
        "Redacción o revisión de un documento mediante el cual una persona reconoce una obligación pendiente, delimitando su origen, monto, condiciones y forma de cumplimiento con el objetivo de reducir incertidumbre sobre la existencia o extensión de la deuda.",

      usefulWhen: [
        "Existe una obligación pendiente que las partes desean documentar expresamente.",
        "La deuda surgió de operaciones, préstamos, entregas de dinero, servicios u otros actos que no quedaron suficientemente documentados.",
        "El acreedor necesita dejar constancia clara del reconocimiento efectuado por el deudor.",
        "Las partes desean complementar el reconocimiento con un cronograma de pago.",
        "Se busca reducir futuras discusiones sobre el origen, monto o existencia de la obligación.",
      ],

      reviewBeforeAssuming: [
        "Origen de la deuda.",
        "Documentación o antecedentes que permitan sustentarla.",
        "Monto inicialmente generado.",
        "Pagos parciales ya realizados.",
        "Saldo que las partes reconocen.",
        "Identidad y capacidad de las partes.",
        "Moneda y condiciones económicas aplicables.",
        "Existencia de intereses o conceptos adicionales legítimamente pactados.",
        "Forma de pago prevista.",
        "Garantías que eventualmente acompañarán el reconocimiento.",
        "Procesos, requerimientos o actuaciones previas vinculadas con la obligación.",
      ],

      workMayInclude: [
        "Identificación precisa del origen de la obligación.",
        "Determinación del monto reconocido.",
        "Reconocimiento del saldo pendiente.",
        "Definición de moneda y forma de cumplimiento.",
        "Incorporación de cronograma de pago cuando corresponda.",
        "Regulación de mora e incumplimiento.",
        "Incorporación de garantías expresamente acordadas.",
        "Definición de comunicaciones y domicilios.",
        "Revisión de coherencia con documentación previa.",
        "Preparación del documento final para firma.",
      ],

      notice:
        "El reconocimiento de deuda puede producir efectos jurídicos relevantes. Antes de redactarlo se revisa que el monto, origen y condiciones reflejen lo realmente aceptado por las partes y que el documento no incorpore obligaciones distintas de aquellas que se pretende reconocer.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Compromiso de pago",

      description:
        "Preparación de un documento mediante el cual una persona asume expresamente el compromiso de cumplir una obligación económica en determinadas condiciones, dejando constancia de los montos, fechas y forma de cumplimiento acordados.",

      usefulWhen: [
        "El deudor ha aceptado realizar un pago en una fecha o cronograma determinado.",
        "Las partes necesitan dejar constancia escrita de un compromiso previamente conversado.",
        "Se requiere documentar una promesa de cumplimiento antes de adoptar medidas adicionales.",
        "El acreedor desea contar con una constancia clara de las condiciones aceptadas.",
        "Existe interés en solucionar la obligación sin escalar inmediatamente la controversia.",
      ],

      reviewBeforeAssuming: [
        "Obligación que origina el compromiso.",
        "Monto pendiente.",
        "Condiciones previamente conversadas.",
        "Fecha o fechas de pago.",
        "Forma y medio de cumplimiento.",
        "Identidad y capacidad del obligado.",
        "Pagos anteriores realizados.",
        "Documentación relacionada con la obligación.",
        "Consecuencias previamente negociadas para el incumplimiento.",
        "Necesidad de garantías o formalidades adicionales.",
      ],

      workMayInclude: [
        "Identificación de la obligación pendiente.",
        "Determinación del monto comprometido.",
        "Definición de fechas y condiciones de pago.",
        "Regulación del medio de cumplimiento.",
        "Constancia de pagos anteriores cuando corresponda.",
        "Definición de consecuencias frente al incumplimiento.",
        "Incorporación de garantías acordadas.",
        "Preparación del documento para firma.",
      ],

      notice:
        "El compromiso de pago debe reflejar obligaciones realmente aceptadas y condiciones que puedan comprenderse y verificarse con facilidad. La redacción busca evitar ambigüedades sobre cuánto, cuándo y cómo debe cumplirse.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },

    {
      title: "Informe jurídico",

      description:
        "Análisis escrito de una cuestión jurídica concreta destinado a ordenar antecedentes, identificar el problema jurídico, revisar la normativa y los criterios relevantes, evaluar alternativas y riesgos, y formular conclusiones profesionales dentro de un alcance previamente delimitado.",

      usefulWhen: [
        "Se necesita documentar técnicamente una posición antes de adoptar una decisión.",
        "Una empresa, entidad o profesional requiere una evaluación jurídica estructurada.",
        "Existen varias alternativas posibles y se necesita comparar sus efectos.",
        "La decisión que debe adoptarse requiere sustento jurídico documentado.",
        "Se necesita dejar constancia de los fundamentos que respaldan una determinada actuación.",
        "El asunto presenta antecedentes, normativa o criterios interpretativos que deben ser ordenados antes de decidir.",
      ],

      reviewBeforeAssuming: [
        "Pregunta o problema jurídico concreto que debe resolverse.",
        "Finalidad que tendrá el informe.",
        "Hechos relevantes y antecedentes disponibles.",
        "Documentación necesaria para comprender el caso.",
        "Normativa sustantiva y procedimental aplicable.",
        "Existencia de jurisprudencia, precedentes o criterios administrativos relevantes.",
        "Posiciones jurídicas contrapuestas que deban ser examinadas.",
        "Riesgos asociados a cada alternativa disponible.",
        "Límites de información o documentación existente.",
        "Nivel de profundidad requerido según el uso previsto del informe.",
      ],

      workMayInclude: [
        "Determinación y delimitación del problema jurídico.",
        "Reconstrucción ordenada de antecedentes.",
        "Identificación de normas aplicables.",
        "Análisis normativo.",
        "Revisión jurisprudencial o de precedentes cuando resulte pertinente.",
        "Contraste entre posiciones jurídicas posibles.",
        "Evaluación de riesgos y consecuencias.",
        "Identificación de alternativas de actuación.",
        "Desarrollo de conclusiones profesionales.",
        "Formulación de recomendaciones dentro del alcance contratado.",
        "Organización de anexos o fuentes documentales cuando corresponda.",
      ],

      notice:
        "El informe jurídico busca convertir una situación compleja en una decisión jurídicamente comprensible. Sus conclusiones dependen de los hechos, documentos y fuentes disponibles al momento del análisis y no sustituyen actuaciones adicionales que puedan ser necesarias posteriormente.",

      pricingMode: "quote_required",
      price: null,
      currency: null,
      professionalLevel: "senior",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
    },
  ],
},
  {
    id: "SRV-TESIS-001", slug: "tesis-juridicas", title: "Asesoría y acompañamiento de Tesis Jurídicas", category: "thesis",
    summary: "Asesoría especializada para proyectos de investigación y tesis en derecho.",
    description: "Acompañamiento metodológico y técnico-jurídico para proyectos de investigación y tesis en derecho, desde la revisión del problema, objetivos y metodología hasta el desarrollo del contenido jurídico, levantamiento de observaciones y preparación para la sustentación.",
    detailImage: {
      src: "/services/details/tesis-juridicas.webp",
      alt: "Asesora acompañando a una estudiante en la revisión y desarrollo de una tesis jurídica.",
    },
    scope: [
      "Diagnóstico del estado actual del proyecto o tesis.",
      "Revisión de coherencia entre problema, objetivos, hipótesis, categorías o variables y metodología.",
      "Acompañamiento en la construcción y revisión del contenido jurídico.",
      "Revisión de marco teórico, normativo, jurisprudencial y antecedentes de investigación.",
      "Orientación para el diseño o mejora de instrumentos de investigación.",
      "Revisión de resultados, discusión, conclusiones y recomendaciones según el diseño metodológico.",
      "Levantamiento técnico de observaciones académicas.",
      "Adecuación formal y bibliográfica conforme a las exigencias de la universidad.",
      "Preparación estratégica para la sustentación.",
    ],
    exclusions: [
      "Elaboración íntegra de una tesis para presentarla como producción personal del estudiante.",
      "Suplantación del tesista en entrevistas, recolección de información, sustentaciones u otras actividades que correspondan personalmente al investigador.",
      "Fabricación, alteración o invención de datos, entrevistas, encuestas, fuentes o resultados.",
      "Garantía de aprobación por parte del asesor, jurado, universidad u otra autoridad académica.",
      "Incorporación de fuentes o afirmaciones que no puedan ser razonablemente verificadas.",
    ],
    modalities: ["Evaluación previa"],
    availability: "evaluation_required", availabilityLabel: "Requiere evaluación", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning:
  "El acompañamiento está orientado a fortalecer la investigación y la capacidad del tesista para desarrollar y defender su propio trabajo. La asistencia profesional respeta las reglas de integridad académica de la universidad y no comprende suplantación, fabricación de información ni garantía de aprobación.",
    publicTagline: "Acompañamiento metodológico y técnico-jurídico",
    targetAudience: [
      "Estudiantes de Derecho que se encuentran elaborando un proyecto de investigación o tesis.",
      "Tesistas que necesitan corregir observaciones formuladas por asesor, jurado o comité académico.",
      "Egresados que cuentan con un proyecto aprobado y requieren acompañamiento para desarrollar sus capítulos.",
      "Tesistas que necesitan revisar la coherencia entre problema, objetivos, hipótesis, categorías o variables y metodología.",
      "Investigadores jurídicos que requieren fortalecer el marco teórico, normativo, jurisprudencial o metodológico de su trabajo.",
      "Tesistas próximos a sustentar que necesitan ordenar la presentación y preparar la defensa de su investigación.",
    ],
    needs: [
      "Determinar si el problema de investigación está correctamente delimitado.",
      "Corregir inconsistencias entre problema, objetivos, hipótesis y metodología.",
      "Revisar una matriz de consistencia antes de continuar desarrollando la investigación.",
      "Fortalecer el marco teórico y jurídico de la tesis.",
      "Identificar normas, jurisprudencia, doctrina y antecedentes pertinentes.",
      "Diseñar o revisar instrumentos de investigación.",
      "Ordenar y analizar información obtenida mediante entrevistas, encuestas, expedientes u otras fuentes.",
      "Levantar observaciones formuladas por el asesor, jurado o universidad.",
      "Adecuar citas, referencias, tablas, figuras y estructura al formato académico exigido.",
      "Preparar la exposición y defensa de la tesis para la sustentación.",
    ],
    scopeGroups: [
      {
        title: "Diseño de investigación",
        items: [
          "Problema general y problemas específicos.",
          "Objetivo general y objetivos específicos.",
          "Hipótesis, categorías o variables según el enfoque adoptado.",
          "Justificación, delimitación y viabilidad del estudio.",
          "Coherencia de la matriz de consistencia.",
        ],
      },
      {
        title: "Metodología",
        items: [
          "Enfoque, tipo y diseño de investigación.",
          "Población, muestra o unidades de análisis cuando correspondan.",
          "Técnicas e instrumentos de recolección de información.",
          "Criterios de selección y procedimiento de análisis.",
          "Coherencia entre metodología y problema investigado.",
        ],
      },
      {
        title: "Desarrollo jurídico",
        items: [
          "Antecedentes nacionales e internacionales pertinentes.",
          "Bases teóricas y categorías jurídicas centrales.",
          "Marco normativo aplicable.",
          "Jurisprudencia y precedentes relevantes.",
          "Construcción de argumentos y contraste de posiciones jurídicas.",
        ],
      },
      {
        title: "Resultados y discusión",
        items: [
          "Ordenamiento de la información obtenida.",
          "Relación entre resultados y objetivos de investigación.",
          "Contraste con antecedentes, doctrina, normativa y jurisprudencia.",
          "Desarrollo de la discusión jurídica.",
          "Revisión de conclusiones y recomendaciones.",
        ],
      },
      {
        title: "Presentación académica",
        items: [
          "Revisión de estructura y consistencia general.",
          "Aplicación del formato institucional exigido.",
          "Citas y referencias conforme a APA 7 cuando corresponda.",
          "Revisión de tablas, figuras y anexos.",
          "Preparación de material para sustentación.",
        ],
      },
    ],
    evaluationInputs: [
      "Proyecto de investigación o tesis en su versión más reciente.",
      "Reglamento, guía o formato de tesis de la universidad.",
      "Matriz de consistencia, cuando ya exista.",
      "Instrumentos de investigación elaborados o validados, si corresponde.",
      "Observaciones formuladas por asesor, jurado o comité académico.",
      "Resolución de aprobación del proyecto, cuando exista.",
      "Cronograma o fecha prevista para presentación o sustentación.",
      "Indicación de los capítulos o aspectos que requieren mayor intervención.",
    ],
    potentialDeliverables: [
      "Informe de diagnóstico del proyecto o tesis.",
      "Matriz de observaciones y propuestas de corrección.",
      "Versión revisada de capítulos dentro del alcance contratado.",
      "Matriz de consistencia revisada.",
      "Instrumento de investigación revisado o estructurado.",
      "Revisión de marco normativo, doctrinal o jurisprudencial.",
      "Matriz de levantamiento de observaciones.",
      "Documento con adecuaciones de citas y referencias.",
      "Estructura de presentación para sustentación.",
      "Banco orientativo de preguntas y preparación para la defensa oral.",
    ],
    stages: [
      "Diagnóstico del proyecto, tesis y observaciones existentes",
      "Revisión de coherencia metodológica y matriz de consistencia",
      "Revisión y fortalecimiento del desarrollo jurídico",
      "Instrumentos, resultados, discusión y control académico",
      "Levantamiento de observaciones y adecuación formal",
      "Preparación para presentación y sustentación",
    ],
    prerequisites: [
      "El tesista debe proporcionar información veraz sobre el estado académico de su investigación.",
      "Las observaciones del asesor o jurado deben entregarse completas cuando el encargo consista en levantarlas.",
      "Las reglas metodológicas y de presentación particulares de la universidad prevalecen sobre formatos generales.",
      "Los plazos de trabajo se determinan después de conocer la extensión, estado y nivel de intervención requerido.",
      "Las decisiones académicas finales sobre enfoque, metodología y contenido corresponden al tesista y a las autoridades de su universidad.",
    ],
    clientContentNotice:
      "El tesista conserva la responsabilidad sobre la originalidad, veracidad de la información, trabajo de campo, resultados y versión finalmente presentada ante su universidad. El equipo de BúhoLex brinda acompañamiento metodológico, técnico-jurídico y editorial dentro del alcance profesional acordado.",
    professionalLevel: "senior",
  },
  {
    id: "SRV-ARB-001",
    slug: "arbitraje-conciliacion",
    title: "Asesoramiento en arbitrajes y conciliaciones",
    category: "legal",

    summary:
      "Representación técnica y acompañamiento en medios alternativos de resolución de conflictos.",

    description:
      "Asesoramiento y defensa estratégica en procedimientos arbitrales y conciliatorios, incluyendo evaluación del conflicto, definición de estrategia, preparación documental, representación técnica y acompañamiento durante las actuaciones o audiencias que correspondan.",

    detailImage: {
      src: "/services/details/arbitrajes-conciliaciones.webp",
      alt: "Profesionales reunidos durante una sesión de análisis vinculada con arbitraje y conciliación.",
    },

    publicTagline:
      "Estrategia, negociación y defensa en mecanismos de solución de controversias.",

    targetAudience: [
      "Personas y empresas involucradas en una controversia que contiene convenio arbitral.",
      "Contratistas, proveedores y entidades vinculados con controversias derivadas de contratos.",
      "Empresas que necesitan evaluar una estrategia antes de iniciar o responder un arbitraje.",
      "Personas o empresas convocadas a una conciliación extrajudicial.",
      "Partes que desean explorar una solución negociada antes de iniciar o continuar un litigio.",
      "Organizaciones que requieren acompañamiento técnico durante negociaciones, audiencias o procedimientos arbitrales.",
    ],

    needs: [
      "Determinar si una controversia debe ser planteada en arbitraje, conciliación u otra vía.",
      "Evaluar el convenio arbitral y su alcance antes de iniciar actuaciones.",
      "Definir pretensiones, defensas y estrategia frente a una controversia contractual.",
      "Preparar una solicitud arbitral, contestación, reconvención u otra actuación relevante.",
      "Organizar documentos, comunicaciones, informes técnicos y demás elementos probatorios.",
      "Preparar una posición negociadora para una conciliación.",
      "Evaluar propuestas de acuerdo y sus efectos jurídicos.",
      "Preparar y acompañar audiencias o actuaciones dentro del procedimiento correspondiente.",
    ],

    scope: [
      "Diagnóstico jurídico inicial de la controversia.",
      "Revisión de contratos, convenio arbitral, antecedentes y comunicaciones relevantes.",
      "Identificación de pretensiones, defensas, riesgos y alternativas de solución.",
      "Definición de estrategia arbitral, conciliatoria o negociadora.",
      "Preparación y revisión de actuaciones escritas dentro del alcance contratado.",
      "Organización de documentos y elementos probatorios.",
      "Preparación para audiencias, reuniones o sesiones de conciliación.",
      "Representación o acompañamiento profesional cuando haya sido expresamente contratado.",
    ],

    scopeGroups: [
      {
        title: "Evaluación de la controversia",
        items: [
          "Origen y evolución del conflicto.",
          "Contrato y obligaciones discutidas.",
          "Convenio arbitral cuando exista.",
          "Pretensiones y posiciones de las partes.",
          "Plazos y actuaciones anteriores.",
          "Documentación y elementos probatorios disponibles.",
        ],
      },
      {
        title: "Arbitraje",
        items: [
          "Evaluación de competencia y alcance del convenio arbitral.",
          "Definición de pretensiones o estrategia de defensa.",
          "Preparación de actuaciones escritas dentro del alcance contratado.",
          "Revisión de prueba documental, técnica o pericial.",
          "Preparación para audiencias.",
          "Seguimiento estratégico de las principales actuaciones arbitrales.",
        ],
      },
      {
        title: "Conciliación y negociación",
        items: [
          "Definición de objetivos mínimos y máximos de negociación.",
          "Identificación de intereses, riesgos y alternativas disponibles.",
          "Evaluación de propuestas de acuerdo.",
          "Preparación de fórmulas conciliatorias.",
          "Revisión de obligaciones, plazos y garantías del eventual acuerdo.",
          "Preparación para audiencia de conciliación o reunión de negociación.",
        ],
      },
      {
        title: "Estrategia probatoria",
        items: [
          "Identificación de documentos relevantes.",
          "Reconstrucción cronológica del conflicto.",
          "Evaluación de comunicaciones y actuaciones contractuales.",
          "Determinación de necesidad de informes técnicos o pericias.",
          "Ordenamiento de elementos de cargo y de defensa.",
        ],
      },
    ],

    evaluationInputs: [
      "Contrato, convenio arbitral y adendas, cuando existan.",
      "Comunicaciones intercambiadas entre las partes.",
      "Actas, cartas, requerimientos, informes o decisiones vinculadas con la controversia.",
      "Cronología de los principales hechos.",
      "Documentación económica o técnica relacionada con las pretensiones.",
      "Actuaciones arbitrales o conciliatorias ya realizadas.",
      "Información sobre plazos o audiencias próximas.",
      "Objetivo que el cliente pretende alcanzar mediante la intervención profesional.",
    ],

    potentialDeliverables: [
      "Informe o diagnóstico inicial de la controversia.",
      "Estrategia arbitral o conciliatoria.",
      "Matriz de hechos, pretensiones, riesgos y elementos probatorios.",
      "Proyecto o revisión de actuaciones escritas dentro del alcance contratado.",
      "Propuesta de estructura de negociación o conciliación.",
      "Preparación documental para audiencia.",
      "Guion estratégico para exposición de la posición del cliente.",
      "Revisión de propuesta o acta de acuerdo.",
    ],

    exclusions: [
      "Garantía de laudo, acuerdo, conciliación o resultado favorable.",
      "Aceptación automática de representación sin evaluación de conflicto de interés y antecedentes.",
      "Inclusión de actuaciones, pericias, informes técnicos o audiencias no comprendidas expresamente en el alcance contratado.",
      "Aceptación de propuestas de acuerdo en nombre del cliente sin autorización expresa.",
      "Asunción de costos arbitrales, administrativos, notariales, periciales o de terceros salvo pacto expreso.",
    ],

    stages: [
      "Diagnóstico inicial de la controversia",
      "Revisión contractual, documental y probatoria",
      "Definición de pretensiones, defensas y estrategia",
      "Preparación de actuaciones o negociación",
      "Audiencias, sesiones o actuaciones comprendidas en el encargo",
      "Evaluación de resultados y siguientes decisiones",
    ],

    prerequisites: [
      "Entrega de contratos y antecedentes relevantes disponibles.",
      "Información completa sobre actuaciones, comunicaciones y plazos en curso.",
      "Verificación previa de ausencia de conflicto de interés.",
      "Delimitación expresa de si el encargo comprende asesoría, redacción, representación o una combinación de estas actuaciones.",
      "Aprobación previa de honorarios, gastos y alcance profesional.",
    ],

    modalities: [
      "Evaluación profesional obligatoria",
    ],

    availability: "evaluation_required",
    availabilityLabel: "Evaluación previa",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "senior",

    requiresConflictCheck: true,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "La estrategia se define después de evaluar la controversia, los antecedentes contractuales, la prueba disponible y el estado del procedimiento. La intervención profesional constituye una obligación de medios y no implica garantía de laudo, acuerdo conciliatorio ni resultado determinado.",
  },
  {
    id: "SRV-DEF-001",
    slug: "patrocinio-defensa",
    title: "Patrocinio y defensa",
    category: "legal",

    summary:
      "Representación técnica en procedimientos judiciales, fiscales, administrativos o arbitrales.",

    description:
      "Patrocinio y defensa profesional en procedimientos judiciales, fiscales, administrativos o arbitrales, con evaluación previa de los antecedentes, riesgos, estrategia y vía aplicable. La aceptación del encargo está sujeta a competencia profesional, ausencia de conflicto de interés y definición expresa de su alcance.",

    detailImage: {
      src: "/services/details/patrocinio-defensa.webp",
      alt: "Abogado y cliente frente a una sede judicial peruana durante el desarrollo de un patrocinio profesional.",
    },

    publicTagline:
      "Defensa estratégica construida a partir de los hechos, la prueba y el estado real del procedimiento.",

    targetAudience: [
      "Personas que han sido demandadas, denunciadas, investigadas, requeridas o emplazadas dentro de un procedimiento.",
      "Personas que necesitan iniciar una actuación judicial, fiscal, administrativa o arbitral para proteger un derecho o interés legítimo.",
      "Empresas y organizaciones involucradas en controversias que requieren representación jurídica especializada.",
      "Funcionarios, servidores, contratistas o administrados que afrontan procedimientos administrativos o sancionadores.",
      "Personas investigadas o procesadas penalmente que requieren estructurar una estrategia de defensa.",
      "Clientes que ya cuentan con un procedimiento en curso y necesitan evaluar su estado, riesgos y siguientes actuaciones.",
    ],

    needs: [
      "Comprender la situación procesal actual antes de adoptar nuevas decisiones.",
      "Definir una estrategia de defensa coherente con los hechos, la documentación y la prueba disponible.",
      "Responder oportunamente demandas, imputaciones, acusaciones, requerimientos o resoluciones.",
      "Identificar excepciones, defensas previas, nulidades, cuestiones probatorias u otros mecanismos jurídicamente disponibles.",
      "Organizar y presentar hechos, argumentos y medios probatorios de manera estratégica.",
      "Preparar escritos, recursos y actuaciones dentro del procedimiento correspondiente.",
      "Contar con representación técnica durante audiencias, diligencias o actuaciones procesales.",
      "Evaluar riesgos procesales y alternativas antes de continuar, negociar, conciliar o impugnar.",
    ],

    scope: [
      "Diagnóstico jurídico y procesal inicial del caso.",
      "Revisión de antecedentes, resoluciones, escritos, actuaciones y documentación disponible.",
      "Identificación de riesgos, oportunidades y cuestiones jurídicas relevantes.",
      "Definición de teoría del caso y estrategia de intervención cuando corresponda.",
      "Preparación o revisión de actuaciones escritas comprendidas en el encargo.",
      "Organización y evaluación de medios probatorios.",
      "Preparación para audiencias, diligencias o actuaciones relevantes.",
      "Representación técnica frente a autoridades u órganos competentes dentro del alcance contratado.",
      "Evaluación periódica del desarrollo del procedimiento y de los siguientes pasos.",
    ],

    scopeGroups: [
      {
        title: "Diagnóstico y estrategia",
        items: [
          "Reconstrucción cronológica de los hechos.",
          "Identificación de las pretensiones, imputaciones o controversias existentes.",
          "Determinación de la vía y estado procesal.",
          "Identificación de riesgos jurídicos y procesales.",
          "Evaluación de alternativas de defensa o actuación.",
          "Definición de objetivos y prioridades del patrocinio.",
        ],
      },
      {
        title: "Defensa procesal",
        items: [
          "Revisión de competencia, legitimidad y presupuestos procesales.",
          "Evaluación de excepciones, defensas previas u otros mecanismos disponibles.",
          "Control de plazos y actuaciones relevantes.",
          "Preparación de contestaciones, oposiciones, absoluciones o impugnaciones comprendidas en el encargo.",
          "Revisión de congruencia entre hechos, argumentos y petitorio.",
          "Seguimiento estratégico de resoluciones y actuaciones procesales.",
        ],
      },
      {
        title: "Estrategia probatoria",
        items: [
          "Identificación de hechos que requieren acreditación.",
          "Revisión de documentos y antecedentes probatorios.",
          "Evaluación de medios de prueba disponibles.",
          "Determinación de necesidad de pericias, informes técnicos u otras fuentes de prueba.",
          "Contraste entre elementos de cargo y de descargo.",
          "Organización de la prueba conforme a la teoría del caso.",
        ],
      },
      {
        title: "Audiencias y actuaciones",
        items: [
          "Preparación de objetivos específicos para cada audiencia o diligencia.",
          "Estructuración de argumentos y puntos centrales de intervención.",
          "Preparación para interrogatorios, declaraciones o actuaciones probatorias cuando corresponda.",
          "Identificación de contingencias previsibles durante la actuación.",
          "Representación o asistencia técnica dentro del alcance contratado.",
          "Evaluación posterior de resultados y decisiones siguientes.",
        ],
      },
    ],

    evaluationInputs: [
      "Relato completo y cronológico de los hechos relevantes.",
      "Demandas, denuncias, disposiciones, resoluciones, requerimientos o actos administrativos relacionados.",
      "Escritos previamente presentados por las partes.",
      "Documentación y medios probatorios disponibles.",
      "Información sobre plazos, notificaciones, audiencias o diligencias próximas.",
      "Identificación de otras personas, empresas o entidades involucradas.",
      "Información sobre abogados o defensas anteriores, cuando corresponda.",
      "Existencia de procedimientos judiciales, fiscales, administrativos, arbitrales o conciliatorios vinculados.",
      "Objetivo principal que el cliente espera alcanzar o proteger mediante el patrocinio.",
    ],

    potentialDeliverables: [
      "Diagnóstico jurídico y procesal inicial.",
      "Estrategia de defensa o actuación.",
      "Cronología estructurada del caso.",
      "Matriz de hechos, riesgos y elementos probatorios cuando resulte útil.",
      "Escritos y recursos expresamente comprendidos en el alcance contratado.",
      "Preparación para audiencias o diligencias.",
      "Revisión de actuaciones y resoluciones relevantes.",
      "Informe o comunicación estratégica sobre decisiones procesales importantes.",
      "Representación técnica durante las actuaciones expresamente contratadas.",
    ],

    exclusions: [
      "Aceptación automática del caso sin evaluación profesional previa.",
      "Garantía de sentencia, archivo, sobreseimiento, absolución, resolución administrativa, laudo o cualquier otro resultado favorable.",
      "Actuaciones, recursos, diligencias, audiencias o procedimientos que no hayan sido comprendidos expresamente en el alcance contratado.",
      "Asunción de honorarios de peritos, tasas, aranceles, gastos notariales, arbitrales, registrales o costos de terceros salvo pacto expreso.",
      "Presentación de hechos, documentos o versiones que el cliente sepa falsos o que no puedan ser razonablemente sustentados.",
      "Adopción de decisiones procesales trascendentes sin coordinación con el cliente cuando su autorización resulte necesaria.",
    ],

    stages: [
      "Diagnóstico inicial y revisión del expediente",
      "Identificación de riesgos, defensas y objetivos",
      "Definición de teoría del caso y estrategia",
      "Preparación de escritos, prueba y actuaciones",
      "Representación en audiencias o diligencias comprendidas en el encargo",
      "Evaluación de resultados y definición de siguientes pasos",
    ],

    prerequisites: [
      "Entrega de información y documentación relevante disponible.",
      "Información oportuna sobre notificaciones, plazos, audiencias y diligencias.",
      "Verificación previa de ausencia de conflicto de interés.",
      "Evaluación de competencia profesional para la materia y vía correspondiente.",
      "Definición expresa del alcance del patrocinio y de las actuaciones comprendidas.",
      "Aprobación previa de honorarios, gastos y condiciones de intervención.",
      "Coordinación permanente respecto de hechos nuevos o decisiones que puedan afectar la estrategia.",
    ],

    modalities: [
      "Evaluación profesional obligatoria",
    ],

    availability: "evaluation_required",
    availabilityLabel: "Evaluación previa obligatoria",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "senior",

    requiresConflictCheck: true,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "La estrategia y el alcance del patrocinio se determinan después de revisar los antecedentes, el estado del procedimiento, la prueba disponible y los riesgos del caso. La intervención profesional constituye una obligación de medios y no implica garantía de resultado.",
  },
  {
    id: "SRV-CONS-001",
    slug: "videoconferencia-profesional",
    title: "Consulta profesional por videoconferencia",
    category: "legal",

    summary:
      "Reunión remota programada para analizar una consulta delimitada y establecer recomendaciones iniciales o próximos pasos.",

    description:
      "Consulta profesional remota orientada a analizar una situación previamente delimitada, revisar sus antecedentes principales, identificar cuestiones jurídicas relevantes y proporcionar una orientación inicial sobre riesgos, alternativas y próximos pasos. La programación se habilitará cuando estén definidos y aprobados el canal, disponibilidad, responsables y condiciones operativas del servicio.",

    detailImage: {
      src: "/services/details/consulta-profesional-videoconferencia.webp",
      alt: "Abogado participando en una consulta profesional por videoconferencia desde una oficina.",
    },

    publicTagline:
      "Orientación profesional remota para comprender el problema antes de decidir cómo actuar.",

    targetAudience: [
      "Personas que necesitan una primera evaluación profesional sin desplazarse físicamente.",
      "Clientes que requieren explicar una situación concreta y conocer alternativas iniciales de actuación.",
      "Personas que han recibido una comunicación, resolución, contrato, requerimiento o documento y necesitan comprender sus efectos principales.",
      "Empresas o profesionales que requieren una reunión breve para delimitar un problema jurídico antes de contratar una intervención de mayor alcance.",
      "Clientes que se encuentran fuera de la ciudad o del país y necesitan orientación profesional remota.",
      "Personas que desean determinar si su asunto requiere asesoría adicional, elaboración documental, negociación, patrocinio u otra intervención especializada.",
    ],

    needs: [
      "Ordenar los hechos relevantes antes de adoptar una decisión.",
      "Comprender el alcance jurídico inicial de una situación concreta.",
      "Identificar riesgos, plazos o aspectos que requieren atención inmediata.",
      "Revisar antecedentes o documentos esenciales durante una reunión profesional.",
      "Evaluar alternativas iniciales de actuación.",
      "Determinar si corresponde contratar un servicio jurídico adicional.",
      "Definir los siguientes pasos razonables después de la consulta.",
    ],

    scope: [
      "Delimitación previa de la consulta.",
      "Revisión de antecedentes esenciales proporcionados antes de la reunión, cuando corresponda.",
      "Entrevista profesional por videoconferencia.",
      "Identificación de las cuestiones jurídicas principales.",
      "Explicación de riesgos y alternativas iniciales.",
      "Orientación sobre próximos pasos razonables.",
      "Determinación preliminar de si el asunto requiere una intervención profesional adicional.",
    ],

    scopeGroups: [
      {
        title: "Antes de la videoconferencia",
        items: [
          "Identificación del asunto que será objeto de consulta.",
          "Recepción de una explicación breve de los hechos relevantes.",
          "Revisión preliminar de documentos esenciales cuando hayan sido solicitados.",
          "Identificación de plazos, notificaciones o actuaciones urgentes.",
          "Confirmación del alcance de la reunión.",
        ],
      },
      {
        title: "Durante la consulta",
        items: [
          "Reconstrucción y aclaración de los hechos principales.",
          "Identificación de las cuestiones jurídicas relevantes.",
          "Revisión de riesgos evidentes conforme a la información disponible.",
          "Explicación de alternativas iniciales de actuación.",
          "Resolución de preguntas comprendidas dentro del objeto previamente delimitado.",
        ],
      },
      {
        title: "Cierre y siguientes pasos",
        items: [
          "Síntesis de las cuestiones principales analizadas.",
          "Identificación de información o documentación adicional que pudiera resultar necesaria.",
          "Orientación sobre actuaciones posteriores razonables.",
          "Determinación preliminar de si corresponde asesoría adicional, elaboración documental o patrocinio.",
          "Definición de un nuevo alcance profesional cuando el asunto requiera continuar.",
        ],
      },
    ],

    evaluationInputs: [
      "Descripción breve y cronológica del problema que se desea consultar.",
      "Identificación de las personas, empresas o entidades involucradas.",
      "Documentos esenciales relacionados con la consulta, cuando resulten necesarios.",
      "Resoluciones, contratos, comunicaciones, requerimientos o notificaciones relevantes.",
      "Información sobre plazos o fechas que puedan condicionar una actuación.",
      "Indicación de procedimientos, procesos o trámites actualmente en curso.",
      "Objetivo concreto que el solicitante desea alcanzar mediante la consulta.",
    ],

    potentialDeliverables: [
      "Orientación profesional proporcionada durante la videoconferencia.",
      "Identificación de riesgos o aspectos que requieren especial atención.",
      "Explicación de alternativas iniciales de actuación.",
      "Recomendación de siguientes pasos conforme a la información evaluada.",
      "Identificación de documentación adicional que convendría revisar.",
      "Propuesta independiente de alcance cuando resulte necesaria una intervención posterior.",
    ],

    exclusions: [
      "Atención inmediata o sin programación previamente confirmada.",
      "Agenda automática mientras el sistema de programación permanezca en preparación.",
      "Revisión ilimitada de expedientes o documentación extensa dentro de una consulta ordinaria.",
      "Elaboración de escritos, contratos, informes, recursos u otros documentos no contratados separadamente.",
      "Representación, patrocinio o actuación frente a terceros o autoridades como consecuencia automática de la consulta.",
      "Garantía de resultado o solución definitiva cuando el asunto requiera actuaciones, prueba o evaluación adicional.",
    ],

    stages: [
      "Solicitud y delimitación inicial de la consulta",
      "Recepción de antecedentes esenciales cuando correspondan",
      "Confirmación de fecha, canal y condiciones de atención",
      "Videoconferencia y análisis profesional",
      "Orientación sobre alternativas y próximos pasos",
      "Definición de intervención adicional cuando resulte necesaria",
    ],

    prerequisites: [
      "Programación y confirmación previa de la videoconferencia.",
      "Delimitación suficientemente clara del asunto que será objeto de consulta.",
      "Entrega anticipada de documentación cuando su revisión resulte necesaria.",
      "Información oportuna sobre plazos, notificaciones o actuaciones urgentes.",
      "Disponibilidad del canal remoto y condiciones técnicas necesarias para realizar la reunión.",
      "Aceptación previa de las condiciones y alcance del servicio cuando la programación sea habilitada.",
    ],

    modalities: [
      "Videoconferencia programada",
    ],

    availability: "coming_soon",
    availabilityLabel: "Programación próximamente disponible",

    pricingMode: "not_defined",
    price: null,
    currency: null,

    professionalLevel: "professional",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Conocer el servicio",
    status: "preparation",

    warning:
      "La consulta por videoconferencia ofrece una orientación profesional inicial dentro de un asunto previamente delimitado. La revisión de expedientes extensos, elaboración de documentos, representación o actuaciones posteriores requieren un alcance independiente.",
  },
  {
    id: "SRV-EMP-001",
    slug: "servicios-empresariales",
    title: "Servicios corporativos",
    category: "corporate",

    summary:
      "Evaluación de necesidades jurídicas y documentales vinculadas con la organización y operación empresarial.",

    description:
      "Asesoría para empresas, organizaciones y emprendimientos en asuntos jurídicos, documentales y corporativos vinculados con su constitución, organización, relaciones internas, decisiones empresariales y operación. El alcance se define según la necesidad concreta, estructura de la organización y documentación disponible.",

    detailImage: {
      src: "/services/details/derecho-corporativo-negocios.webp",
      alt: "Profesionales analizando documentación y decisiones durante una reunión corporativa.",
    },

    publicTagline:
      "Estructura jurídica para decisiones empresariales, relaciones internas y operaciones corporativas.",

    targetAudience: [
      "Empresas que requieren ordenar o revisar su estructura jurídica y documental.",
      "Sociedades que necesitan regularizar decisiones societarias, poderes, acuerdos o actuaciones internas.",
      "Emprendimientos que buscan formalizar relaciones, responsabilidades y operaciones antes de crecer.",
      "Empresas familiares que requieren documentar adecuadamente decisiones, transferencias o relaciones entre socios.",
      "Organizaciones que necesitan revisar contratos, actas, convenios u otros instrumentos vinculados con su operación.",
      "Gerentes, socios, administradores y representantes que necesitan evaluar riesgos antes de adoptar decisiones corporativas.",
    ],

    needs: [
      "Definir la estructura jurídica adecuada para una operación o decisión empresarial.",
      "Revisar la validez, coherencia y suficiencia de documentación societaria o corporativa.",
      "Ordenar acuerdos entre socios, administradores o representantes.",
      "Preparar actas, poderes, contratos, convenios u otros documentos vinculados con la actividad empresarial.",
      "Evaluar riesgos jurídicos antes de asumir obligaciones o ejecutar una operación.",
      "Regularizar documentación pendiente o inconsistente.",
      "Determinar qué actuación societaria o corporativa corresponde antes de acudir a notaría, registros públicos u otra entidad.",
      "Coordinar decisiones jurídicas con necesidades contables, tributarias, administrativas o comerciales.",
    ],

    scope: [
      "Diagnóstico de la necesidad empresarial o corporativa.",
      "Revisión de antecedentes societarios, contractuales y documentales.",
      "Identificación de riesgos, inconsistencias y actuaciones pendientes.",
      "Definición de la estructura jurídica o documental adecuada.",
      "Preparación o revisión de documentos comprendidos en el alcance contratado.",
      "Evaluación de poderes, acuerdos, responsabilidades y facultades de representación.",
      "Coordinación jurídica de actuaciones notariales, registrales o administrativas cuando corresponda.",
      "Control final de coherencia entre la decisión empresarial y su soporte documental.",
    ],

    scopeGroups: [
      {
        title: "Organización societaria",
        items: [
          "Revisión de constitución, estatuto y modificaciones.",
          "Identificación de socios, participaciones o acciones.",
          "Revisión de órganos de administración y representación.",
          "Evaluación de facultades, poderes y vigencia de cargos.",
          "Regularización de documentación societaria pendiente.",
        ],
      },
      {
        title: "Acuerdos y decisiones corporativas",
        items: [
          "Preparación o revisión de actas.",
          "Acuerdos de junta, directorio u otros órganos cuando correspondan.",
          "Formalización de decisiones empresariales.",
          "Revisión de quórum, representación y facultades.",
          "Coherencia entre acuerdos adoptados y documentos posteriores.",
        ],
      },
      {
        title: "Contratos y relaciones empresariales",
        items: [
          "Revisión o elaboración de contratos vinculados con la operación.",
          "Convenios entre socios, empresas o terceros.",
          "Adendas, modificaciones y formalización de acuerdos.",
          "Identificación de obligaciones, riesgos y mecanismos de cumplimiento.",
          "Revisión de cláusulas de terminación, responsabilidad y solución de controversias.",
        ],
      },
      {
        title: "Operaciones y regularización",
        items: [
          "Evaluación jurídica previa de operaciones empresariales.",
          "Revisión de documentación para trámites notariales o registrales.",
          "Ordenamiento de antecedentes y títulos.",
          "Identificación de actos que requieren formalización adicional.",
          "Coordinación con necesidades contables, tributarias o administrativas cuando resulte necesario.",
        ],
      },
    ],

    evaluationInputs: [
      "Partida registral o documentos de constitución de la empresa, cuando correspondan.",
      "Estatuto, modificaciones, poderes o vigencias disponibles.",
      "Actas, acuerdos societarios o documentos internos relevantes.",
      "Contratos, convenios o comunicaciones vinculadas con la operación consultada.",
      "Identificación de socios, administradores, representantes o terceros involucrados.",
      "Descripción concreta de la decisión, problema u operación que se pretende ejecutar.",
      "Información sobre trámites notariales, registrales o administrativos en curso.",
      "Documentación contable, tributaria o comercial cuando resulte necesaria para comprender la operación.",
    ],

    potentialDeliverables: [
      "Diagnóstico jurídico corporativo inicial.",
      "Matriz de riesgos, pendientes y alternativas de actuación.",
      "Proyecto o revisión de actas y acuerdos societarios.",
      "Proyecto o revisión de poderes y documentos de representación.",
      "Contratos, convenios o adendas dentro del alcance contratado.",
      "Informe o recomendación sobre la estructura jurídica de una operación.",
      "Documentación para coordinación notarial, registral o administrativa.",
      "Hoja de ruta para regularización corporativa o documental.",
    ],

    exclusions: [
      "Paquetes genéricos no evaluados ni adaptados a la estructura real de la empresa.",
      "Garantía de inscripción registral, aprobación administrativa o resultado comercial.",
      "Asunción de responsabilidades contables, tributarias o financieras no comprendidas expresamente en el encargo.",
      "Actuaciones notariales, registrales o administrativas no incluidas en el alcance contratado.",
      "Decisiones empresariales o societarias adoptadas por cuenta del cliente sin autorización o competencia correspondiente.",
      "Incorporación de acuerdos, operaciones o documentos que no puedan ser razonablemente sustentados.",
    ],

    stages: [
      "Diagnóstico de la necesidad corporativa",
      "Revisión de estructura y antecedentes documentales",
      "Identificación de riesgos y alternativas",
      "Definición de la solución jurídica o documental",
      "Preparación y revisión de instrumentos",
      "Coordinación de formalización y siguientes pasos",
    ],

    prerequisites: [
      "Entrega de documentación societaria y contractual relevante disponible.",
      "Identificación clara de la operación, decisión o problema que requiere atención.",
      "Información suficiente sobre socios, representantes y facultades involucradas.",
      "Definición expresa del alcance de revisión, redacción o acompañamiento requerido.",
      "Aprobación previa de honorarios, gastos y actuaciones adicionales.",
    ],

    modalities: [
      "Evaluación corporativa previa",
    ],

    availability: "evaluation_required",
    availabilityLabel: "Requiere evaluación",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "senior",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "La solución corporativa se define después de revisar la estructura de la organización, sus antecedentes y la operación concreta. La intervención profesional no sustituye decisiones empresariales del cliente ni garantiza resultados registrales, administrativos o comerciales.",
  },
  {
    id: "SRV-ACC-001",
    slug: "servicios-contables",
    title: "Servicios contables y contabilidad gubernamental",
    category: "accounting",

    summary:
      "Asesoría contable especializada, con énfasis en contabilidad gubernamental, gestión financiera pública, conciliación de información y cumplimiento contable.",

    description:
      "Servicio especializado para entidades, profesionales y organizaciones que requieren revisar, ordenar o fortalecer su información contable y financiera. Se prioriza la atención de necesidades vinculadas con contabilidad gubernamental, ejecución presupuestaria, conciliaciones, registros, cierres, rendiciones y consistencia de la información financiera pública, sin excluir servicios contables y tributarios para empresas y profesionales del sector privado.",

    detailImage: {
      src: "/services/details/contabilidad-tributacion.webp",
      alt: "Profesionales revisando documentación contable, financiera y presupuestaria con apoyo de herramientas de trabajo.",
    },

    publicTagline:
      "Contabilidad, control y consistencia financiera para la gestión pública y empresarial.",

    targetAudience: [
      "Entidades públicas que requieren apoyo técnico en contabilidad gubernamental y gestión financiera.",
      "Oficinas de administración, contabilidad, tesorería, presupuesto, logística y áreas vinculadas con la ejecución del gasto público.",
      "Municipalidades, organismos públicos y unidades ejecutoras que necesitan revisar conciliaciones, registros o cierres contables.",
      "Funcionarios y servidores responsables de información financiera, presupuestaria o patrimonial.",
      "Empresas y organizaciones que requieren ordenamiento contable y tributario.",
      "Profesionales independientes que necesitan evaluar obligaciones contables o tributarias.",
    ],

    needs: [
      "Revisar la consistencia entre información contable, presupuestaria y financiera.",
      "Identificar diferencias pendientes de conciliación antes de un cierre contable.",
      "Ordenar registros vinculados con ejecución de ingresos, gastos, activos, obligaciones y operaciones financieras.",
      "Revisar documentación contable que sustenta operaciones de una entidad pública.",
      "Detectar inconsistencias entre registros, auxiliares, reportes y documentación fuente.",
      "Preparar o revisar conciliaciones contables, bancarias, patrimoniales o presupuestarias.",
      "Apoyar procesos de cierre mensual, trimestral o anual.",
      "Ordenar información necesaria para rendiciones, transferencias de gestión, auditorías o acciones de control.",
      "Evaluar obligaciones contables y tributarias de empresas o profesionales.",
      "Definir acciones de regularización frente a información incompleta, inconsistente o pendiente.",
    ],

    scope: [
      "Diagnóstico inicial de la situación contable y financiera.",
      "Revisión de registros, reportes, auxiliares y documentación de sustento.",
      "Análisis de consistencia entre información contable, presupuestaria, financiera y patrimonial.",
      "Identificación de diferencias, partidas pendientes y necesidades de regularización.",
      "Preparación o revisión de conciliaciones según el alcance contratado.",
      "Asistencia técnica para cierres y ordenamiento de información.",
      "Revisión de obligaciones contables y tributarias cuando corresponda.",
      "Definición de una hoja de ruta para subsanar observaciones o inconsistencias detectadas.",
    ],

    scopeGroups: [
      {
        title: "Contabilidad gubernamental",
        items: [
          "Revisión de registros contables vinculados con operaciones de la entidad.",
          "Análisis de consistencia entre información financiera, presupuestaria y contable.",
          "Revisión de operaciones de ingresos y gastos.",
          "Evaluación de partidas contables pendientes de regularización.",
          "Revisión de saldos y movimientos de cuentas relevantes.",
          "Apoyo técnico para procesos de cierre contable.",
          "Ordenamiento de información requerida para reportes financieros.",
        ],
      },
      {
        title: "Conciliaciones y control de información",
        items: [
          "Conciliaciones bancarias.",
          "Conciliaciones contables y presupuestarias.",
          "Conciliación de cuentas por cobrar y cuentas por pagar.",
          "Revisión de saldos patrimoniales.",
          "Contraste entre auxiliares, registros y documentación fuente.",
          "Identificación de diferencias y partidas pendientes.",
          "Preparación de matrices de conciliación y seguimiento.",
        ],
      },
      {
        title: "Gestión financiera y presupuestaria pública",
        items: [
          "Revisión de información relacionada con la ejecución presupuestaria.",
          "Análisis de correspondencia entre operaciones financieras y registros contables.",
          "Revisión documental de compromisos, devengados, girados y pagos cuando formen parte del encargo.",
          "Identificación de operaciones que requieren regularización o sustentación adicional.",
          "Apoyo en la organización de información para cierres, rendiciones o transferencias.",
          "Coordinación técnica con áreas de presupuesto, tesorería, logística y patrimonio cuando resulte necesaria.",
        ],
      },
      {
        title: "Sistemas e información financiera",
        items: [
          "Revisión de reportes generados por sistemas utilizados por la entidad.",
          "Contraste entre información registrada y documentación de sustento.",
          "Detección de diferencias entre módulos o fuentes de información.",
          "Organización de información para conciliaciones y verificaciones.",
          "Revisión de trazabilidad documental de operaciones seleccionadas.",
          "Apoyo en la preparación de información requerida para controles internos o externos.",
        ],
      },
      {
        title: "Contabilidad empresarial y tributaria",
        items: [
          "Diagnóstico contable inicial.",
          "Revisión de registros y documentación empresarial.",
          "Identificación de obligaciones tributarias relevantes.",
          "Evaluación de contingencias contables o tributarias.",
          "Ordenamiento de información para cumplimiento periódico.",
          "Planeamiento contable o tributario dentro del alcance profesional contratado.",
        ],
      },
    ],

    evaluationInputs: [
      "Descripción de la entidad, empresa u organización y de la necesidad concreta.",
      "Periodo contable o ejercicio que requiere revisión.",
      "Estados financieros, balances, auxiliares o reportes disponibles.",
      "Información presupuestaria cuando corresponda.",
      "Reportes provenientes de los sistemas utilizados por la entidad.",
      "Conciliaciones existentes y partidas pendientes de regularización.",
      "Estados de cuenta bancarios cuando resulten necesarios.",
      "Documentación fuente de las operaciones que serán evaluadas.",
      "Informes, observaciones, requerimientos o acciones de control relacionados con la materia.",
      "Información sobre cierres, rendiciones o plazos próximos.",
      "En el sector privado, declaraciones, registros y documentación tributaria vinculada con el encargo.",
    ],

    potentialDeliverables: [
      "Diagnóstico contable y financiero inicial.",
      "Matriz de diferencias, observaciones y partidas pendientes.",
      "Conciliaciones comprendidas en el alcance contratado.",
      "Matriz de seguimiento para regularización de saldos.",
      "Informe de consistencia entre información contable, financiera y presupuestaria.",
      "Revisión de documentación sustentatoria de operaciones seleccionadas.",
      "Hoja de ruta para cierre o regularización contable.",
      "Informe de observaciones y recomendaciones técnicas.",
      "Documentación de apoyo para rendiciones, transferencias o acciones de control dentro del alcance contratado.",
      "Diagnóstico contable o tributario para empresas y profesionales.",
    ],

    exclusions: [
      "Asunción automática de responsabilidades contables correspondientes a periodos o gestiones anteriores.",
      "Validación de información que no cuente con documentación suficiente para ser razonablemente sustentada.",
      "Modificación, eliminación o incorporación de registros sin autorización y procedimiento correspondiente.",
      "Garantía de aprobación de estados financieros, rendiciones, auditorías, fiscalizaciones o acciones de control.",
      "Certificación, firma o presentación de información reservada a un profesional habilitado cuando dichas actuaciones no hayan sido expresamente contratadas y asignadas al profesional competente.",
      "Asunción de responsabilidad funcional correspondiente a servidores, funcionarios o responsables de los sistemas administrativos de la entidad.",
      "Representación ante autoridades tributarias, órganos de control u otras entidades cuando no haya sido contratada expresamente.",
    ],

    stages: [
      "Diagnóstico de la necesidad contable y financiera",
      "Recepción y clasificación de información",
      "Revisión de registros, reportes y documentación fuente",
      "Conciliación e identificación de diferencias",
      "Definición de regularizaciones y acciones necesarias",
      "Entrega de resultados y seguimiento según el alcance contratado",
    ],

    prerequisites: [
      "Identificación previa del periodo, operación o materia que será revisada.",
      "Entrega de información y documentación disponible en condiciones que permitan su evaluación.",
      "Acceso autorizado a reportes o información institucional cuando resulte necesario.",
      "Identificación de plazos de cierre, rendición, auditoría o presentación que puedan afectar el encargo.",
      "Delimitación expresa de las responsabilidades del equipo profesional y de los responsables de la entidad.",
      "Aprobación previa del alcance, honorarios y actuaciones adicionales.",
    ],

    modalities: [
      "Evaluación contable previa",
      "Revisión documental",
      "Asistencia técnica según alcance aprobado",
    ],

    availability: "evaluation_required",
    availabilityLabel: "Requiere evaluación",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "senior",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "El alcance se determina después de revisar el periodo, los registros, la documentación disponible y la responsabilidad técnica involucrada. La asistencia profesional no sustituye las funciones legalmente asignadas a los responsables de los sistemas administrativos ni implica validación automática de información sin sustento suficiente.",
  },
  {
    id: "SRV-GOV-001",
    slug: "servicios-gubernamentales",
    title: "Contrataciones con el Estado",
    category: "government",

    summary:
      "Asesoría jurídica especializada para participar, contratar y resolver incidencias en procedimientos y contratos con entidades públicas.",

    description:
      "Acompañamiento jurídico especializado en contratación pública, dirigido a proveedores, contratistas, empresas y organizaciones que intervienen en procedimientos de selección o mantienen relaciones contractuales con entidades del Estado. El servicio comprende evaluación normativa, revisión documental, interpretación de reglas aplicables, estrategia frente a incidencias y acompañamiento durante las distintas etapas de la contratación, según el alcance previamente definido.",

    detailImage: {
      src: "/services/details/asuntos-gubernamentales.webp",
      alt: "Profesionales revisando documentación relacionada con procedimientos de contratación pública y relaciones con entidades del Estado.",
    },

    publicTagline:
      "Asesoría estratégica para contratar con el Estado y gestionar correctamente cada etapa del procedimiento.",

    targetAudience: [
      "Empresas interesadas en participar en procedimientos de contratación pública.",
      "Proveedores y contratistas que mantienen contratos vigentes con entidades del Estado.",
      "Consorcios y empresas que requieren revisar requisitos, bases o condiciones de participación.",
      "Contratistas que enfrentan incidencias durante la ejecución contractual.",
      "Empresas que necesitan evaluar penalidades, ampliaciones, prestaciones adicionales, resoluciones u otras decisiones de la entidad.",
      "Organizaciones que requieren interpretar normativa de contratación pública antes de adoptar una decisión.",
      "Empresas que necesitan preparar una posición jurídica frente a actuaciones administrativas o contractuales de una entidad pública.",
    ],

    needs: [
      "Interpretar normas de contratación pública aplicables a un caso concreto.",
      "Revisar bases, requisitos de calificación o condiciones de participación.",
      "Evaluar observaciones, consultas, absoluciones o decisiones de la entidad.",
      "Verificar requisitos antes de presentar una oferta.",
      "Analizar incidencias surgidas durante la ejecución contractual.",
      "Evaluar ampliaciones de plazo, penalidades, prestaciones adicionales, deductivos o modificaciones contractuales.",
      "Revisar comunicaciones, cartas, requerimientos o decisiones emitidas durante la ejecución.",
      "Determinar la estrategia jurídica frente a una posible resolución contractual.",
      "Preparar descargos, solicitudes, recursos o documentos vinculados con la contratación.",
      "Evaluar si una controversia debe continuar por vía administrativa, conciliación, arbitraje u otro mecanismo.",
    ],

    scope: [
      "Diagnóstico jurídico inicial del caso.",
      "Revisión de bases, contratos, términos de referencia, especificaciones técnicas y documentos relacionados.",
      "Interpretación normativa aplicable a la contratación o ejecución contractual.",
      "Identificación de riesgos, obligaciones y alternativas de actuación.",
      "Preparación o revisión de escritos, comunicaciones o solicitudes dentro del alcance contratado.",
      "Evaluación de incidencias surgidas durante la ejecución contractual.",
      "Acompañamiento jurídico frente a actuaciones de la entidad.",
      "Preparación estratégica para reuniones, audiencias o actuaciones vinculadas con la controversia.",
    ],

    scopeGroups: [
      {
        title: "Procedimientos de selección",
        items: [
          "Revisión de bases y requisitos de participación.",
          "Análisis de criterios de calificación y evaluación.",
          "Consultas y observaciones a las bases cuando corresponda.",
          "Revisión de documentación para presentación de ofertas.",
          "Evaluación de subsanaciones y actuaciones posteriores.",
          "Revisión de decisiones vinculadas con admisión, evaluación o adjudicación.",
        ],
      },
      {
        title: "Interpretación normativa",
        items: [
          "Evaluación de normas aplicables al caso concreto.",
          "Análisis de disposiciones legales, reglamentarias y criterios administrativos relevantes.",
          "Interpretación de obligaciones derivadas de bases, contrato y normativa aplicable.",
          "Evaluación de efectos jurídicos de decisiones de la entidad.",
          "Análisis de cambios normativos que puedan afectar el procedimiento o contrato.",
          "Orientación jurídica mediante videoconferencia, informe o escrito, según el alcance contratado.",
        ],
      },
      {
        title: "Ejecución contractual",
        items: [
          "Revisión de obligaciones contractuales.",
          "Evaluación de ampliaciones de plazo.",
          "Análisis de penalidades.",
          "Revisión de adicionales, deductivos o modificaciones cuando correspondan.",
          "Evaluación de suspensiones, incumplimientos o incidencias contractuales.",
          "Revisión de conformidades, recepción, pagos y actuaciones vinculadas con el cumplimiento.",
        ],
      },
      {
        title: "Controversias y defensa contractual",
        items: [
          "Evaluación de requerimientos y decisiones de la entidad.",
          "Preparación de descargos o comunicaciones jurídicas.",
          "Análisis de resolución contractual o riesgo de resolución.",
          "Evaluación de medidas previas a conciliación o arbitraje.",
          "Construcción de posición jurídica y documental frente a una controversia.",
          "Coordinación con patrocinio arbitral cuando el conflicto requiera intervención especializada.",
        ],
      },
    ],

    evaluationInputs: [
      "Bases, términos de referencia, especificaciones técnicas o expediente de contratación.",
      "Contrato y adendas, cuando existan.",
      "Oferta presentada y documentación del procedimiento de selección.",
      "Resoluciones, cartas, comunicaciones o requerimientos emitidos por la entidad.",
      "Documentación relacionada con la ejecución contractual.",
      "Cronología de los principales hechos.",
      "Información sobre plazos vigentes o actuaciones próximas.",
      "Documentación técnica, económica o administrativa vinculada con la controversia.",
      "Objetivo concreto que el cliente pretende alcanzar.",
    ],

    potentialDeliverables: [
      "Informe de interpretación normativa.",
      "Diagnóstico jurídico de la contratación o ejecución contractual.",
      "Matriz de riesgos, obligaciones y alternativas.",
      "Revisión de bases o requisitos de participación.",
      "Proyecto o revisión de consultas, observaciones, solicitudes o descargos.",
      "Informe sobre ampliación de plazo, penalidades, resolución u otra incidencia contractual.",
      "Revisión de comunicaciones dirigidas a la entidad.",
      "Hoja de ruta para actuación administrativa, conciliatoria o arbitral.",
      "Preparación estratégica para reuniones o actuaciones frente a la entidad.",
    ],

    exclusions: [
      "Garantía de adjudicación, buena pro, aprobación, pago o resultado favorable.",
      "Preparación o presentación de ofertas comerciales sin evaluación y alcance expresamente contratado.",
      "Asunción de funciones administrativas, técnicas o logísticas que correspondan al cliente.",
      "Certificación de información técnica o económica que dependa de profesionales o áreas distintas.",
      "Representación ante entidades, tribunales o centros arbitrales cuando no haya sido contratada expresamente.",
      "Asunción de costos de procedimientos, arbitrajes, pericias, tasas o servicios de terceros salvo pacto expreso.",
    ],

    stages: [
      "Diagnóstico del procedimiento o contrato",
      "Revisión normativa y documental",
      "Identificación de riesgos y alternativas",
      "Definición de estrategia jurídica",
      "Preparación de actuaciones o escritos",
      "Seguimiento y evaluación de siguientes decisiones",
    ],

    prerequisites: [
      "Entrega de bases, contrato y documentos relevantes disponibles.",
      "Información completa sobre actuaciones, comunicaciones y plazos vigentes.",
      "Identificación precisa de la etapa en la que se encuentra el procedimiento o contrato.",
      "Definición expresa de si el encargo comprende consulta, informe, redacción, acompañamiento o representación.",
      "Aprobación previa de honorarios, gastos y alcance profesional.",
    ],

    modalities: [
      "Evaluación jurídica previa",
      "Videoconferencia especializada",
      "Informe o escrito jurídico según alcance aprobado",
    ],

    availability: "evaluation_required",
    availabilityLabel: "Requiere evaluación",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "senior",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "La interpretación y estrategia se formulan después de revisar la etapa del procedimiento, la documentación disponible, la normativa aplicable y los antecedentes del caso. La asesoría constituye una obligación de medios y no implica garantía de adjudicación, aprobación, reconocimiento económico ni resultado determinado.",
  },
  {
    id: "SRV-ING-001",
    slug: "ingenieria-civil-saneamiento-inmobiliario",
    title: "Ingeniería civil para saneamiento inmobiliario",
    category: "engineering",

    summary:
      "Servicios técnicos orientados a la identificación, regularización y documentación física de inmuebles, coordinados con los requisitos municipales, registrales y legales aplicables.",

    description:
      "Servicio técnico de ingeniería civil orientado al levantamiento, identificación y documentación física de inmuebles para procedimientos de saneamiento, regularización, rectificación, independización, subdivisión, acumulación y actuaciones relacionadas. La intervención se define después de evaluar los antecedentes documentales, la situación física del predio y el procedimiento aplicable.",

    detailImage: {
      src: "/services/details/ingenieria-civil-saneamiento.webp",
      alt: "Equipo técnico realizando un levantamiento topográfico con estación total, planos y equipamiento de ingeniería.",
    },

    publicTagline:
      "Levantamiento, diagnóstico y documentación técnica para regularizar la realidad física del inmueble.",

    targetAudience: [
      "Propietarios que necesitan regularizar diferencias entre la realidad física del inmueble y la información registral.",
      "Personas que requieren rectificar áreas, linderos o medidas perimétricas.",
      "Propietarios que desean independizar, subdividir o acumular predios.",
      "Empresas inmobiliarias, constructoras y organizaciones que requieren documentación técnica para procedimientos municipales o registrales.",
      "Personas que necesitan planos, memorias descriptivas u otros documentos técnicos para saneamiento físico legal.",
      "Clientes que requieren coordinación entre levantamiento técnico, catastro, municipalidad, registros públicos y estrategia legal.",
    ],

    needs: [
      "Determinar el área, linderos, medidas perimétricas y ubicación real de un inmueble.",
      "Comparar la realidad física del predio con títulos, partidas registrales, planos o antecedentes existentes.",
      "Identificar diferencias de área, superposición aparente o inconsistencias documentales.",
      "Preparar documentación técnica para rectificación de áreas, linderos y medidas perimétricas.",
      "Preparar documentación para independización, subdivisión o acumulación.",
      "Regularizar construcciones, fábrica u otras características físicas cuando el procedimiento lo permita.",
      "Generar planos y memorias descriptivas para expedientes municipales o registrales.",
      "Coordinar información técnica con requerimientos catastrales, urbanísticos, registrales o legales.",
    ],

    scope: [
      "Diagnóstico técnico inicial del inmueble.",
      "Revisión de antecedentes documentales y gráficos disponibles.",
      "Levantamiento topográfico o verificación física cuando resulte necesario.",
      "Determinación de áreas, linderos, medidas perimétricas y ubicación.",
      "Preparación de planos y memorias descriptivas dentro del alcance contratado.",
      "Identificación de diferencias entre información física, municipal, catastral y registral.",
      "Preparación de documentación técnica para procedimientos de saneamiento.",
      "Coordinación técnico-legal cuando el procedimiento requiera integrar información de ingeniería y sustento jurídico.",
    ],

    scopeGroups: [
      {
        title: "Levantamiento y diagnóstico físico",
        items: [
          "Inspección y reconocimiento del inmueble.",
          "Levantamiento topográfico cuando corresponda.",
          "Determinación de vértices, linderos y medidas perimétricas.",
          "Cálculo de área.",
          "Identificación de ocupación, edificaciones y elementos físicos relevantes.",
          "Contraste entre realidad física y documentación existente.",
        ],
      },
      {
        title: "Planos y documentación técnica",
        items: [
          "Plano perimétrico.",
          "Plano de ubicación y localización.",
          "Plano de distribución cuando corresponda.",
          "Memoria descriptiva.",
          "Cuadros de áreas, coordenadas, linderos y medidas perimétricas.",
          "Documentación gráfica complementaria según el procedimiento.",
        ],
      },
      {
        title: "Rectificación y saneamiento",
        items: [
          "Rectificación de área.",
          "Rectificación de linderos.",
          "Rectificación de medidas perimétricas.",
          "Evaluación de diferencias entre área física y área registrada.",
          "Preparación técnica para saneamiento físico legal.",
          "Revisión de antecedentes gráficos y catastrales.",
        ],
      },
      {
        title: "Independización, subdivisión y acumulación",
        items: [
          "Evaluación física previa del predio.",
          "Definición de áreas resultantes.",
          "Elaboración de planos técnicos.",
          "Preparación de memorias descriptivas.",
          "Revisión de accesos, linderos y configuración física.",
          "Adecuación de la documentación al procedimiento municipal o registral aplicable.",
        ],
      },
      {
        title: "Regularización de edificaciones",
        items: [
          "Verificación física de construcciones existentes.",
          "Levantamiento de distribución y áreas construidas.",
          "Preparación de planos conforme al estado físico verificado.",
          "Memorias descriptivas y documentación técnica aplicable.",
          "Identificación de diferencias respecto de licencias, declaratorias o antecedentes existentes.",
          "Coordinación con requisitos municipales y registrales.",
        ],
      },
      {
        title: "Coordinación técnico-legal",
        items: [
          "Revisión conjunta de planos, partidas y títulos cuando resulte necesario.",
          "Identificación de inconsistencias entre catastro y registro.",
          "Apoyo técnico para escritos o expedientes de saneamiento.",
          "Preparación de información para observaciones municipales o registrales.",
          "Coordinación con profesionales jurídicos cuando el caso requiera sustento normativo adicional.",
          "Definición de una hoja de ruta técnica antes de iniciar el procedimiento.",
        ],
      },
    ],

    evaluationInputs: [
      "Partida registral o documentación de propiedad disponible.",
      "Escritura pública, contrato, título o antecedente documental relevante.",
      "Planos antiguos, certificados catastrales o documentos gráficos existentes.",
      "Información municipal disponible sobre el predio.",
      "Licencias, declaratorias de fábrica u otros antecedentes de edificación, cuando existan.",
      "Ubicación exacta y acceso al inmueble.",
      "Descripción de las diferencias o problemas detectados.",
      "Documentación de colindantes o antecedentes vinculados cuando resulten necesarios.",
      "Observaciones municipales, registrales o catastrales previamente formuladas.",
      "Objetivo concreto del procedimiento que se desea realizar.",
    ],

    potentialDeliverables: [
      "Informe técnico de diagnóstico físico.",
      "Levantamiento topográfico dentro del alcance contratado.",
      "Plano perimétrico.",
      "Plano de ubicación y localización.",
      "Plano de distribución cuando corresponda.",
      "Memoria descriptiva.",
      "Cuadro de coordenadas, áreas, linderos y medidas perimétricas.",
      "Documentación técnica para rectificación, independización, subdivisión o acumulación.",
      "Documentación técnica para regularización de edificaciones.",
      "Matriz de diferencias entre realidad física y antecedentes disponibles.",
      "Hoja de ruta técnico-legal para saneamiento del inmueble.",
    ],

    exclusions: [
      "Viabilidad automática del procedimiento sin revisión física, documental y normativa previa.",
      "Garantía de inscripción registral, aprobación municipal o resultado catastral determinado.",
      "Certificación de información física que no haya podido ser verificada razonablemente.",
      "Asunción de controversias de propiedad, posesión o titularidad que requieran tratamiento jurídico independiente.",
      "Modificación de información técnica para hacerla coincidir artificialmente con títulos o registros.",
      "Actuaciones municipales, registrales o notariales no comprendidas expresamente en el alcance contratado.",
      "Estudios especializados distintos de ingeniería civil, topografía o saneamiento cuando requieran profesionales de otra especialidad.",
    ],

    stages: [
      "Diagnóstico documental y definición del objetivo",
      "Inspección y levantamiento físico cuando corresponda",
      "Procesamiento y contraste de información",
      "Elaboración de planos y documentación técnica",
      "Revisión de consistencia municipal, catastral y registral",
      "Entrega y definición de siguientes actuaciones",
    ],

    prerequisites: [
      "Acceso autorizado al inmueble cuando la inspección o levantamiento sean necesarios.",
      "Entrega de títulos, planos y antecedentes disponibles.",
      "Identificación clara del procedimiento que se desea realizar.",
      "Información sobre observaciones municipales, registrales o catastrales existentes.",
      "Coordinación con colindantes cuando el procedimiento requiera información o intervención de terceros.",
      "Aprobación previa del alcance técnico, honorarios, desplazamientos y gastos adicionales.",
    ],

    modalities: [
      "Evaluación técnica previa obligatoria",
      "Inspección de campo cuando corresponda",
      "Coordinación técnico-legal según el procedimiento",
    ],

    availability: "evaluation_required",
    availabilityLabel: "Evaluación técnica previa obligatoria",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "professional",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación técnica",
    status: "active",

    warning: engineeringWarning,
  },
  {
    id: "SRV-WEB-001",
    slug: "diseno-desarrollo-paginas-web-profesionales",
    title: "Diseño y desarrollo de páginas web profesionales",
    category: "digital",

    publicTagline:
      "Sitios web profesionales diseñados para presentar, organizar y hacer crecer la presencia digital de una organización.",

    summary:
      "Diseño y desarrollo de sitios web profesionales para empresas, estudios, consultoras, profesionales y organizaciones que necesitan una presencia digital institucional, clara y escalable.",

    description:
      "Diseño y desarrollo de sitios web institucionales, profesionales y comerciales, adaptados a la identidad, actividad y necesidades operativas de cada organización. Cada proyecto se delimita mediante una evaluación técnica y comercial previa para definir arquitectura, contenidos, funcionalidades, presupuesto, plazo y condiciones de publicación.",

    detailImage: {
      src: "/services/details/soluciones-digitales.webp",
      alt: "Equipo de desarrollo web trabajando en programación, diseño de interfaces y construcción de productos digitales.",
    },

    targetAudience: [
      "Abogados y estudios jurídicos",
      "Notarías y centros de conciliación",
      "Contadores y oficinas contables o tributarias",
      "Consultoras",
      "Empresas constructoras e inmobiliarias",
      "Profesionales independientes",
      "Organizaciones e instituciones",
      "Negocios que requieren una presencia digital profesional",
    ],

    siteTypes: [
      "Página profesional",
      "Sitio institucional",
      "Estudio jurídico",
      "Oficina contable o tributaria",
      "Consultora",
      "Empresa",
      "Inmobiliaria",
      "Catálogo de servicios",
      "Catálogo de productos",
      "Blog o sección editorial",
      "Biblioteca digital",
      "Portal informativo",
      "Plataforma con espacio privado",
      "Solución web personalizada",
    ],

    needs: [
      "Presentar una organización y sus servicios con una imagen profesional y coherente.",
      "Ordenar contenidos, servicios y canales institucionales para facilitar su comprensión.",
      "Generar mayor confianza mediante una presencia digital clara, consistente y técnicamente cuidada.",
      "Facilitar el contacto, consulta o solicitud de información por parte de clientes o usuarios.",
      "Construir catálogos, bibliotecas, buscadores o áreas informativas especializadas.",
      "Reemplazar o modernizar sitios web desactualizados, poco claros o no adaptados a dispositivos móviles.",
      "Preparar herramientas, formularios o funcionalidades específicas según las necesidades del proyecto.",
      "Dejar una base técnica escalable para futuras áreas privadas, integraciones o servicios digitales.",
    ],

    scope: [
      "Diagnóstico de objetivos, público y necesidades del proyecto.",
      "Definición de arquitectura, estructura y experiencia de navegación.",
      "Diseño visual adaptado a la identidad de la organización.",
      "Desarrollo responsive para escritorio, tablet y móvil.",
      "Implementación de contenidos y funcionalidades comprendidas en el alcance aprobado.",
      "Validación técnica, accesibilidad básica y optimización inicial.",
      "Entrega, publicación y mantenimiento únicamente según lo expresamente contratado.",
    ],

    scopeGroups: [
      {
        title: "Identidad y estructura",
        items: [
          "Definición de arquitectura del sitio",
          "Adaptación de identidad visual",
          "Navegación institucional",
          "Página de inicio",
          "Presentación de la organización",
          "Equipo o profesionales",
          "Páginas de servicios",
          "Canales de contacto",
        ],
      },
      {
        title: "Contenido",
        items: [
          "Organización del contenido proporcionado",
          "Redacción o adecuación editorial básica",
          "Fichas de servicios",
          "Preguntas frecuentes",
          "Artículos o blog",
          "Páginas legales",
          "Llamados a la acción",
        ],
      },
      {
        title: "Funcionalidades posibles",
        items: [
          "Formularios y canales institucionales",
          "Buscadores y filtros",
          "Catálogos",
          "Bibliotecas digitales",
          "Áreas privadas e integraciones únicamente cuando sean evaluadas y contratadas",
        ],
      },
      {
        title: "Calidad técnica",
        items: [
          "Diseño responsive",
          "Accesibilidad básica",
          "Optimización de imágenes",
          "Metadatos y SEO técnico inicial",
          "Estructura semántica",
          "Seguridad básica de formularios",
          "Preparación para dominio y hosting",
          "Documentación mínima de entrega",
        ],
      },
      {
        title: "Mantenimiento futuro",
        items: [
          "Actualizaciones de contenido",
          "Mantenimiento técnico",
          "Respaldo",
          "Revisión de enlaces",
          "Actualización de dependencias",
          "Soporte durante el periodo contratado",
        ],
      },
    ],

    moduleGroups: [
      {
        title: "Base institucional",
        level: "basic",
        levelLabel: "Básico",
        items: [
          "Inicio institucional",
          "Presentación de servicios",
          "Perfiles profesionales o equipo",
          "Preguntas frecuentes",
          "Secciones legales acordadas",
        ],
      },
      {
        title: "Contenido y consulta",
        level: "optional",
        levelLabel: "Opcional",
        items: [
          "Publicaciones y artículos",
          "Testimonios autorizados",
          "Catálogo",
          "Biblioteca",
          "Buscador",
          "WhatsApp Business",
          "Correo corporativo",
        ],
      },
      {
        title: "Funciones que requieren definición",
        level: "evaluation_required",
        levelLabel: "Sujeto a evaluación",
        items: [
          "Formularios de contacto",
          "Agenda o solicitud de cita",
          "Documentos",
          "Dominio y hosting",
          "Mantenimiento y soporte",
        ],
      },
      {
        title: "Capacidades avanzadas",
        level: "future_integration",
        levelLabel: "Posible ampliación",
        items: [
          "Área privada",
          "Gestión de usuarios",
          "Pagos",
          "Automatizaciones",
          "Analítica",
          "Asistentes especializados",
        ],
      },
    ],

    budgetFactors: [
      "Número de páginas",
      "Complejidad del diseño",
      "Disponibilidad de textos e imágenes",
      "Identidad gráfica existente",
      "Dominio",
      "Hosting",
      "Correo corporativo",
      "Formularios",
      "Integraciones",
      "Funciones privadas",
      "Carga inicial de contenido",
      "Optimización",
      "Mantenimiento",
      "Soporte",
      "Plazo solicitado",
    ],

    technicalResponsibilities: [
      {
        title: "Diseño visual",
        description:
          "Se define según identidad, referencias y complejidad aprobadas.",
      },
      {
        title: "Desarrollo técnico",
        description:
          "Comprende únicamente páginas, componentes y funciones descritos en la propuesta.",
      },
      {
        title: "Dominio",
        description:
          "Registro, renovación y titularidad se acuerdan expresamente y pueden tener costo independiente.",
      },
      {
        title: "Hosting",
        description:
          "Proveedor, capacidad, renovación y soporte no se consideran incluidos salvo contratación expresa.",
      },
      {
        title: "Correo corporativo",
        description:
          "Cuentas, proveedor y configuración dependen del alcance y servicios externos disponibles.",
      },
      {
        title: "Carga de contenidos",
        description:
          "Se limita al volumen inicial acordado y a materiales entregados oportunamente.",
      },
      {
        title: "SEO técnico inicial",
        description:
          "Incluye únicamente las medidas técnicas expresamente previstas y no garantiza posiciones determinadas en buscadores.",
      },
      {
        title: "Propiedad y accesos",
        description:
          "La titularidad de dominios, cuentas, repositorios, credenciales y servicios asociados se define expresamente en la propuesta y en la entrega.",
      },
      {
        title: "Servicios de terceros",
        description:
          "Licencias, APIs, plugins, proveedores externos y servicios con costos recurrentes se identifican y presupuestan separadamente cuando correspondan.",
      },
      {
        title: "Mantenimiento",
        description:
          "Es un servicio posterior y separado cuando no figure en la propuesta aprobada.",
      },
      {
        title: "Soporte",
        description:
          "Canal, horario, periodo y nivel de atención deben quedar definidos por contrato.",
      },
      {
        title: "Integraciones adicionales",
        description:
          "Requieren compatibilidad, proveedor, seguridad, costo y alcance específicos.",
      },
    ],

    evaluationInputs: [
      "Nombre o razón social",
      "Actividad principal",
      "Público objetivo",
      "Servicios o productos",
      "Identidad gráfica disponible",
      "Textos disponibles",
      "Fotografías o material visual autorizado",
      "Datos de contacto institucionales",
      "Páginas requeridas",
      "Funciones deseadas",
      "Referencias visuales",
      "Dominio o hosting existente",
      "Plazo esperado",
    ],

    potentialDeliverables: [
      "Arquitectura de contenidos",
      "Diseño responsive",
      "Desarrollo del sitio",
      "Configuración de secciones",
      "Formularios acordados",
      "Integración de canales institucionales",
      "Carga inicial acordada",
      "Configuración técnica básica",
      "Documentación de entrega",
      "Capacitación básica",
      "Soporte inicial",
      "Mantenimiento contratado",
    ],

    exclusions: [
      "El precio y el plazo se determinan después de evaluar el alcance real del proyecto.",
      "Dominio, hosting, correo y servicios de terceros se presupuestan de manera independiente cuando no estén incluidos expresamente.",
      "Pagos, áreas privadas, automatizaciones e integraciones requieren evaluación técnica específica.",
      "El SEO técnico inicial no constituye garantía de una posición determinada en buscadores.",
      "El servicio no implica garantía de ventas, captación de clientes o resultado comercial.",
      "La producción extensa de textos, fotografías, videos o identidad gráfica requiere un alcance propio.",
      "Las modificaciones posteriores que excedan el alcance aprobado se cotizan separadamente.",
      "La publicación se realiza después de la validación del cliente y de los controles técnicos correspondientes.",
    ],

    stages: [
      "Evaluación inicial",
      "Definición del alcance",
      "Propuesta técnica y económica",
      "Recolección de contenidos",
      "Diseño de estructura e interfaz",
      "Desarrollo",
      "Revisión del cliente",
      "Correcciones comprendidas en el alcance",
      "Validación responsive en escritorio, tablet y móvil",
      "Validación técnica",
      "Entrega o publicación autorizada",
      "Mantenimiento, cuando sea contratado",
    ],

    prerequisites: [
      "Evaluación técnica y comercial previa",
      "Aceptación expresa de la propuesta y del alcance",
      "Precio y plazo aprobados antes de iniciar",
      "Funciones e integraciones delimitadas",
      "Contenidos entregados en condiciones y formatos acordados",
    ],

    clientContentNotice:
      "El cliente debe contar con autorización para utilizar las marcas, fotografías, textos, logotipos y demás contenidos que entregue para el proyecto.",

    modalities: [
      "Evaluación técnica y comercial previa",
    ],

    availability: "evaluation_required",
    availabilityLabel:
      "Disponible previa evaluación técnica y comercial",

    pricingMode: "quote_required",
    price: null,
    currency: null,

    professionalLevel: "professional",

    requiresConflictCheck: false,
    requiresEvaluation: true,
    allowsImmediatePayment: false,

    responsible: null,

    ctaLabel: "Solicitar evaluación",
    status: "active",

    warning:
      "Cada proyecto se define de manera individual según objetivos, estructura, contenidos, funciones e integraciones requeridas. La propuesta identifica expresamente qué incluye el desarrollo, qué servicios dependen de terceros y qué prestaciones pueden contratarse posteriormente.",

    published: false,
  },
] satisfies readonly PublicService[];

export const publicServices = publicServiceCatalogSchema.parse(serviceRecords) as readonly PublicService[];

export function getPublicServiceBySlug(slug: string): PublicService | undefined {
  return publicServices.find((service) => service.slug === slug);
}
