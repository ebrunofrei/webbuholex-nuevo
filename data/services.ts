import { publicServiceCatalogSchema } from "@/lib/schemas/services";
import type { PublicService } from "@/types/services";

const engineeringWarning = "La viabilidad depende de la documentación existente, situación física, antecedentes registrales, zonificación, competencia municipal y requisitos aplicables al caso.";

const serviceRecords = [
  {
    id: "SRV-LEGAL-001", slug: "asesoria-juridica", title: "Asesoría jurídica", category: "legal",
    summary: "Evaluación profesional de una situación concreta, identificación de riesgos y orientación sobre alternativas de actuación.",
    description: "Servicio sujeto a delimitación previa de los hechos, la jurisdicción, la materia y el objetivo de la consulta.",
    scope: ["Evaluación inicial de la situación", "Identificación de riesgos jurídicos", "Alternativas de actuación"],
    exclusions: ["Promesas de resultado", "Representación sin aceptación expresa del encargo"], modalities: ["Coordinación institucional"],
    availability: "available", availabilityLabel: "Disponible previa coordinación", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning: null,
  },
  {
    id: "SRV-DOC-001", slug: "revision-personalizacion-documental", title: "Revisión y personalización documental", category: "documentary",
    summary: "Revisión, adecuación o elaboración de documentos conforme a los hechos, finalidad y jurisdicción aplicable.",
    description: "El alcance se define después de revisar la finalidad del documento, sus antecedentes y las formalidades aplicables.",
    scope: ["Revisión documental", "Adecuación al caso concreto", "Redacción sujeta a evaluación"],
    exclusions: ["Uso automático de plantillas", "Validación sin antecedentes suficientes"], modalities: ["Evaluación documental previa"],
    availability: "evaluation_required", availabilityLabel: "Evaluación previa", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning: null,
  },
  {
    id: "SRV-DEF-001", slug: "patrocinio-defensa", title: "Patrocinio y defensa", category: "defense",
    summary: "Representación técnica en procedimientos judiciales, fiscales, administrativos o arbitrales.",
    description: "La aceptación exige evaluar competencia, conflicto de interés, antecedentes, alcance y condiciones de contratación.",
    scope: ["Evaluación de estrategia", "Representación técnica cuando sea aceptada", "Defensa en la vía aplicable"],
    exclusions: ["Aceptación automática del caso", "Garantía de resultado"], modalities: ["Evaluación profesional obligatoria"],
    availability: "evaluation_required", availabilityLabel: "Evaluación previa obligatoria", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: true, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning: null,
  },
  {
    id: "SRV-CONS-001", slug: "videoconferencia-profesional", title: "Consulta profesional por videoconferencia", category: "professional_consultation",
    summary: "Reunión remota programada para analizar una consulta delimitada y establecer recomendaciones iniciales o próximos pasos.",
    description: "La programación se habilitará cuando estén aprobados el canal, disponibilidad, responsables y condiciones del servicio.",
    scope: ["Consulta delimitada", "Recomendaciones iniciales", "Definición de próximos pasos"],
    exclusions: ["Agenda automática en esta fase", "Atención sin coordinación confirmada"], modalities: ["Videoconferencia futura"],
    availability: "coming_soon", availabilityLabel: "Programación próximamente disponible", pricingMode: "not_defined", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Conocer el servicio", status: "preparation", warning: null,
  },
  {
    id: "SRV-EMP-001", slug: "servicios-empresariales", title: "Servicios empresariales", category: "business",
    summary: "Evaluación de necesidades jurídicas y documentales vinculadas con la organización y operación empresarial.",
    description: "El alcance depende de la necesidad concreta, la estructura de la organización y la documentación disponible.",
    scope: ["Identificación de la necesidad empresarial", "Revisión de antecedentes", "Propuesta de alcance"],
    exclusions: ["Paquetes genéricos no evaluados", "Resultado comercial garantizado"], modalities: ["Evaluación previa"],
    availability: "evaluation_required", availabilityLabel: "Requiere evaluación", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning: null,
  },
  {
    id: "SRV-ADM-001", slug: "servicios-administrativos", title: "Servicios administrativos", category: "administrative",
    summary: "Evaluación de actuaciones y documentación para trámites administrativos dentro del alcance institucional aprobado.",
    description: "Cada encargo requiere identificar autoridad competente, requisitos, antecedentes y situación actual del trámite.",
    scope: ["Identificación del trámite", "Revisión de requisitos", "Definición del apoyo requerido"],
    exclusions: ["Tramitación automática", "Garantía de aprobación administrativa"], modalities: ["Evaluación previa"],
    availability: "evaluation_required", availabilityLabel: "Requiere evaluación", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning: null,
  },
  {
    id: "SRV-ING-001", slug: "ingenieria-civil-saneamiento-inmobiliario", title: "Ingeniería civil para saneamiento inmobiliario", category: "civil_engineering",
    summary: "Servicios técnicos orientados a la identificación, regularización y documentación física de inmuebles, coordinados con los requisitos municipales, registrales y legales aplicables.",
    description: "La intervención técnica se define después de evaluar los antecedentes documentales, la situación física del inmueble y el procedimiento que podría corresponder.",
    scope: ["Levantamientos técnicos", "Planos perimétricos", "Planos de ubicación", "Memorias descriptivas", "Rectificación de áreas, linderos y medidas perimétricas", "Independización", "Subdivisión", "Acumulación", "Regularización física de predios", "Documentación técnica para saneamiento físico legal", "Apoyo técnico para expedientes municipales y registrales", "Coordinación técnico-legal"],
    exclusions: ["Viabilidad automática del procedimiento", "Garantía de inscripción", "Resultado municipal o registral garantizado"], modalities: ["Evaluación técnica previa obligatoria"],
    availability: "evaluation_required", availabilityLabel: "Evaluación técnica previa obligatoria", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación técnica", status: "active", warning: engineeringWarning,
  },
  {
    id: "SRV-WEB-001", slug: "diseno-desarrollo-paginas-web-profesionales", title: "Diseño y desarrollo de páginas web profesionales", category: "digital",
    publicTagline: "Soluciones digitales para organizaciones jurídicas, contables, tributarias, empresariales y profesionales.",
    summary: "Diseño y desarrollo de páginas web profesionales para estudios jurídicos, notarías, oficinas contables y tributarias, consultoras, inmobiliarias, empresas, profesionales independientes y organizaciones que requieran presencia digital institucional.",
    description: "Diseño y desarrollo de sitios web institucionales, profesionales y comerciales, adaptados a la identidad, actividad y necesidades operativas de cada organización. Cada proyecto se delimita mediante una evaluación técnica y comercial antes de definir su alcance, presupuesto y plazo.",
    scope: ["Evaluación y planificación del proyecto", "Arquitectura, identidad y contenidos", "Diseño y desarrollo responsive", "Accesibilidad y calidad técnica básica", "Entrega y mantenimiento según alcance aprobado"],
    scopeGroups: [
      { title: "Identidad y estructura", items: ["Definición de arquitectura del sitio", "Adaptación de identidad visual", "Navegación institucional", "Página de inicio", "Presentación de la organización", "Equipo o profesionales", "Páginas de servicios", "Canales de contacto"] },
      { title: "Contenido", items: ["Organización del contenido proporcionado", "Redacción o adecuación editorial básica", "Fichas de servicios", "Preguntas frecuentes", "Artículos o blog", "Páginas legales", "Llamados a la acción"] },
      { title: "Funcionalidades posibles", items: ["Formularios y canales institucionales", "Buscadores y filtros", "Catálogos", "Bibliotecas digitales", "Áreas privadas e integraciones únicamente cuando sean evaluadas y contratadas"] },
      { title: "Calidad técnica", items: ["Diseño responsive", "Accesibilidad básica", "Optimización de imágenes", "Metadatos y SEO técnico inicial", "Estructura semántica", "Seguridad básica de formularios", "Preparación para dominio y hosting", "Documentación mínima de entrega"] },
      { title: "Mantenimiento futuro", items: ["Actualizaciones de contenido", "Mantenimiento técnico", "Respaldo", "Revisión de enlaces", "Actualización de dependencias", "Soporte durante el periodo contratado"] },
    ],
    targetAudience: ["Abogados y estudios jurídicos", "Notarías y centros de conciliación", "Contadores y oficinas contables o tributarias", "Consultoras", "Empresas constructoras e inmobiliarias", "Profesionales independientes", "Organizaciones e instituciones", "Negocios que requieran presencia digital profesional"],
    siteTypes: ["Página profesional", "Sitio institucional", "Estudio jurídico", "Oficina contable o tributaria", "Consultora", "Empresa", "Inmobiliaria", "Catálogo de servicios", "Catálogo de productos", "Blog o sección editorial", "Biblioteca digital", "Portal informativo", "Plataforma con espacio privado", "Solución web personalizada"],
    needs: ["Presentar una organización y sus servicios con claridad", "Ordenar contenidos y canales institucionales", "Construir catálogos o bibliotecas públicas", "Preparar herramientas, formularios o buscadores definidos", "Dejar una base técnica para futuras áreas privadas o comerciales"],
    moduleGroups: [
      { title: "Base institucional", level: "basic", levelLabel: "Básico", items: ["Inicio institucional", "Presentación de servicios", "Perfiles profesionales o equipo", "Preguntas frecuentes", "Secciones legales acordadas"] },
      { title: "Contenido y consulta", level: "optional", levelLabel: "Opcional", items: ["Publicaciones y artículos", "Testimonios autorizados", "Catálogo", "Biblioteca", "Buscador", "WhatsApp Business", "Correo corporativo"] },
      { title: "Funciones que requieren definición", level: "evaluation_required", levelLabel: "Sujeto a evaluación", items: ["Formularios de contacto", "Agenda o solicitud de cita", "Documentos", "Dominio y hosting", "Mantenimiento y soporte"] },
      { title: "Capacidades avanzadas", level: "future_integration", levelLabel: "Integración futura", items: ["Área privada", "Gestión de usuarios", "Pagos", "Automatizaciones", "Analítica", "Asistentes especializados"] },
    ],
    budgetFactors: ["Número de páginas", "Complejidad del diseño", "Disponibilidad de textos e imágenes", "Identidad gráfica existente", "Dominio", "Hosting", "Correo corporativo", "Formularios", "Integraciones", "Funciones privadas", "Carga inicial de contenido", "Optimización", "Mantenimiento", "Soporte", "Plazo solicitado"],
    technicalResponsibilities: [
      { title: "Diseño visual", description: "Se define según identidad, referencias y complejidad aprobadas." },
      { title: "Desarrollo técnico", description: "Comprende únicamente páginas, componentes y funciones descritos en la propuesta." },
      { title: "Dominio", description: "Registro, renovación y titularidad se acuerdan expresamente y pueden tener costo independiente." },
      { title: "Hosting", description: "Proveedor, capacidad, renovación y soporte no se consideran incluidos salvo contratación expresa." },
      { title: "Correo corporativo", description: "Cuentas, proveedor y configuración dependen del alcance y servicios externos disponibles." },
      { title: "Carga de contenidos", description: "Se limita al volumen inicial acordado y a materiales entregados oportunamente." },
      { title: "SEO técnico inicial", description: "Incluye solo las medidas técnicas expresamente previstas; no garantiza posiciones en buscadores." },
      { title: "Mantenimiento", description: "Es un servicio posterior y separado cuando no figure en la propuesta aprobada." },
      { title: "Soporte", description: "Canal, horario, periodo y nivel de atención deben quedar definidos por contrato." },
      { title: "Integraciones adicionales", description: "Requieren compatibilidad, proveedor, seguridad, costo y alcance específicos." },
    ],
    evaluationInputs: ["Nombre o razón social", "Actividad principal", "Público objetivo", "Servicios o productos", "Identidad gráfica disponible", "Textos disponibles", "Fotografías o material visual autorizado", "Datos de contacto institucionales", "Páginas requeridas", "Funciones deseadas", "Referencias visuales", "Dominio o hosting existente", "Plazo esperado"],
    potentialDeliverables: ["Arquitectura de contenidos", "Diseño responsive", "Desarrollo del sitio", "Configuración de secciones", "Formularios acordados", "Integración de canales institucionales", "Carga inicial acordada", "Configuración técnica básica", "Documentación de entrega", "Capacitación básica", "Soporte inicial", "Mantenimiento contratado"],
    exclusions: ["No existe precio fijo público", "No se inicia trabajo sin evaluación y aceptación del alcance", "Dominio, hosting y servicios de terceros pueden generar costos independientes", "Pagos, áreas privadas, automatizaciones e integraciones requieren evaluación específica", "No se garantiza posicionamiento determinado en buscadores", "No se garantiza resultado comercial", "No incluye producción ilimitada de textos, fotografías, videos o identidad gráfica", "Las modificaciones fuera del alcance aprobado deben cotizarse", "La publicación depende de la aprobación del cliente y de los controles técnicos correspondientes"],
    stages: ["Evaluación inicial", "Definición del alcance", "Propuesta técnica y económica", "Recolección de contenidos", "Diseño de estructura e interfaz", "Desarrollo", "Revisión del cliente", "Correcciones comprendidas en el alcance", "Validación técnica", "Entrega o publicación autorizada", "Mantenimiento, cuando sea contratado"],
    prerequisites: ["Evaluación técnica y comercial previa", "Aceptación expresa de la propuesta y del alcance", "Precio y plazo aprobados antes de iniciar", "Funciones e integraciones delimitadas", "Contenidos entregados en condiciones y formatos acordados"],
    clientContentNotice: "El cliente debe contar con autorización para utilizar las marcas, fotografías, textos, logotipos y demás contenidos que entregue para el proyecto.",
    modalities: ["Evaluación técnica y comercial previa"],
    availability: "evaluation_required", availabilityLabel: "Disponible previa evaluación técnica y comercial", pricingMode: "quote_required", price: null, currency: null,
    requiresConflictCheck: false, requiresEvaluation: true, allowsImmediatePayment: false, responsible: null, ctaLabel: "Solicitar evaluación", status: "active", warning: "El alcance, presupuesto y plazo se definen después de evaluar el proyecto. Ningún módulo, integración, dominio, hosting, correo o mantenimiento se considera incluido sin definición expresa.", published: false,
  },
] satisfies readonly PublicService[];

export const publicServices = publicServiceCatalogSchema.parse(serviceRecords) as readonly PublicService[];

export function getPublicServiceBySlug(slug: string): PublicService | undefined {
  return publicServices.find((service) => service.slug === slug);
}
