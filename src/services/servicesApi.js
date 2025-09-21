// src/services/servicesApi.js
// Catálogo en memoria + utilidades para la página de Servicios

// === Contacto ===
export const WA = import.meta.env.VITE_WA_NUMBER || "51922038280";

export const CTA_WHATSAPP = (text = "Hola, quisiera información de un servicio") =>
  `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

export const CTA_MESSENGER =
  "https://www.facebook.com/share/1HrTtaEEC6/";

// === Helpers ===
export const formatPrice = (s) => {
  // Acepta price, priceFrom/priceTo o ambos vacíos; devuelve string amable
  if (!s) return "";
  if (typeof s.price === "number") return `S/ ${s.price}`;
  const from = s.priceFrom != null ? `S/ ${s.priceFrom}` : null;
  const to   = s.priceTo   != null ? ` – ${s.priceTo}`   : "";
  return from ? `${from}${to}` : "A consultar";
};

// === Catálogo: categorías e ítems ===
// (Puedes ampliar/cambiar sin tocar los componentes)
export const CATEGORIES = [
  {
    slug: "consultas-planes",
    icon: "💬",
    title: "Consultas & planes",
    items: [
      {
        slug: "consulta-express",
        title: "Consulta express por chat + 15 min llamada",
        excerpt: "Ideal para decidir rápido o validar una idea.",
        priceFrom: 39, priceTo: 59, duration: "mismo día",
      },
      {
        slug: "consulta-completa",
        title: "Consulta completa 45 min + informe breve",
        excerpt: "Diagnóstico y hoja de ruta en un documento simple.",
        priceFrom: 89, priceTo: 149, duration: "24–48 h",
      },
      {
        slug: "plan-mensual",
        title: "Plan mensual (4 consultas + revisión de 2 documentos)",
        excerpt: "Acompañamiento continuo para personas y mypes.",
        priceFrom: 189, priceTo: 289, duration: "mensual",
      },
    ],
  },
  {
    slug: "redaccion-revision",
    icon: "📝",
    title: "Redacción / Revisión",
    items: [
      {
        slug: "revision-contrato-6p",
        title: "Revisión de contrato (hasta 6 págs) + checklist de riesgos",
        excerpt: "Informe de riesgos prácticos y recomendaciones.",
        priceFrom: 129,
      },
      {
        slug: "elaboracion-contrato",
        title: "Elaboración de contrato (civil/laboral/arrendamiento/compraventa)",
        excerpt: "Contrato a medida, listo para firmar.",
        priceFrom: 199, priceTo: 349,
      },
      {
        slug: "escritos-procesales-base",
        title: "Escritos procesales (demanda, contestación, apelación) “base + ajustes”",
        excerpt: "Modelo robusto + ajustes según tu caso.",
        priceFrom: 250, priceTo: 600,
      },
    ],
  },
  {
    slug: "administrativo-tributario",
    icon: "🏛️",
    title: "Administrativo & tributario",
    items: [
      {
        slug: "descargo-papeletas",
        title: "Descargo de papeletas + apelación",
        excerpt: "Redacción técnica y gestión.",
        priceFrom: 120, priceTo: 250,
      },
      {
        slug: "descargos-muni-osce-indecopi",
        title: "Descargos y recursos ante Municipalidad/OSCE/INDECOPI",
        excerpt: "Impugna sanciones y protege tu actividad.",
        priceFrom: 250, priceTo: 800,
      },
      {
        slug: "cartas-notariales-rectificaciones",
        title: "Cartas notariales y rectificaciones simples",
        excerpt: "Redacción y pautas de entrega.",
        priceFrom: 120, priceTo: 180,
      },
    ],
  },
  {
    slug: "familia-civil",
    icon: "👪",
    title: "Familia y civil",
    items: [
      {
        slug: "divorcio-notarial-rapido",
        title: "Divorcio rápido notarial (honorarios + guía de requisitos)",
        excerpt: "Acompañamiento completo hasta la escritura.",
        priceFrom: 480,
      },
      {
        slug: "tenencia-alimentos",
        title: "Tenencia/alimentos: demanda o variación",
        excerpt: "Estrategia y escrito base para tu caso.",
        priceFrom: 350, priceTo: 700,
      },
      {
        slug: "desalojo-expres",
        title: "Desalojo exprés / ocupación precaria",
        excerpt: "Ruta legal, escritos y seguimiento básico.",
        priceFrom: 450, priceTo: 950,
      },
      {
        slug: "saneamiento-sunarp",
        title: "Saneamiento de título / SUNARP (estudio + plan de ruta)",
        excerpt: "Diagnóstico registral y acciones recomendadas.",
        priceFrom: 350, priceTo: 900,
      },
    ],
  },
  {
    slug: "penal-preliminar",
    icon: "⚖️",
    title: "Penal (etapa preliminar)",
    items: [
      {
        slug: "denuncia-querella",
        title: "Asesoría de denuncia/querella + redacción",
        excerpt: "Presentación sólida desde el inicio.",
        priceFrom: 350, priceTo: 800,
      },
      {
        slug: "defensa-preliminares",
        title: "Defensa en diligencias preliminares (paquete)",
        excerpt: "Acompañamiento en citaciones, declaraciones, etc.",
        priceFrom: 600, priceTo: 1500,
      },
    ],
  },
  {
    slug: "laboral",
    icon: "🧾",
    title: "Laboral",
    items: [
      {
        slug: "liquidacion-estrategia",
        title: "Cálculo y carta de liquidación + estrategia",
        excerpt: "Todo listo para presentarlo.",
        priceFrom: 120, priceTo: 220,
      },
      {
        slug: "demanda-beneficios-despido",
        title: "Demanda por beneficios / despido arbitrario",
        excerpt: "Cálculo + demanda base y guía de trámite.",
        priceFrom: 450, priceTo: 1200,
      },
    ],
  },
  {
    slug: "empresas",
    icon: "🏢",
    title: "Empresas",
    items: [
      {
        slug: "constitucion-llave-en-mano",
        title: "Constitución de empresa “llave en mano”",
        excerpt: "Nombre, minuta, escritura y RUC en regla.",
        priceFrom: 650, priceTo: 1200,
      },
      {
        slug: "modificacion-estatutos-poderes",
        title: "Modificación de estatutos / junta / poderes",
        excerpt: "Actas, inscripción, publicidad registral.",
        priceFrom: 350, priceTo: 850,
      },
      {
        slug: "compliance-basico-mypes",
        title: "Compliance básico para mypes (contratos, políticas, RGPD/Habeas Data)",
        excerpt: "Kit esencial + implementación guiada.",
        priceFrom: 600, priceTo: 1200,
      },
    ],
  },
  {
    slug: "migratorio",
    icon: "🛂",
    title: "Migratorio",
    items: [
      {
        slug: "tramites-extranjeria",
        title: "Prórroga, calidad migratoria, carné de extranjería",
        excerpt: "Gestión y escritos ante Migraciones.",
        priceFrom: 250, priceTo: 900,
      },
    ],
  },
  {
    slug: "digital-ingreso-pasivo",
    icon: "💼",
    title: "Digital (ingreso pasivo)",
    items: [
      {
        slug: "pack-plantillas-word",
        title: "Pack de plantillas (contratos, cartas, escritos) en Word",
        excerpt: "Listas para editar. Incluye guía de uso.",
        priceFrom: 39, priceTo: 199,
      },
      {
        slug: "guias-paso-a-paso",
        title: "Guías “paso a paso” (divorcio notarial, desalojo, descargos, etc.)",
        excerpt: "Aprende a gestionar trámites simples.",
        priceFrom: 0, priceTo: 99,
      },
      {
        slug: "cursos-talleres-cortos",
        title: "Cursos/talleres: “Cómo ganar tu audiencia virtual”, “Lee tu expediente”",
        excerpt: "Formato práctico y directo.",
        priceFrom: 0, priceTo: 120,
      },
      {
        slug: "membresia-buholex",
        title: "Membresía BúhoLex (S/ 19–49/mes)",
        excerpt: "Comunidad, modelos premium, actualizaciones legales, 1 consultita/mes.",
        priceFrom: 19, priceTo: 49,
      },
    ],
  },
  {
    slug: "upsells",
    icon: "✨",
    title: "Upsells (margen alto)",
    items: [
      { slug: "entrega-24h", title: "Entrega en 24h", priceFrom: 39 },
      { slug: "traduccion", title: "Traducción", priceFrom: 69 },
      { slug: "compulsa-notarial", title: "Compulsa notarial", priceFrom: 59 },
      { slug: "seguimiento-whatsapp", title: "Seguimiento por WhatsApp 7 días", priceFrom: 79 },
      { slug: "simulacro-audiencia", title: "Simulacro de audiencia", priceFrom: 99 },
    ],
  },
];

// === Accesores ===
export const getCategories = () => CATEGORIES;

export const getFlatServices = () =>
  CATEGORIES.flatMap(c =>
    (c.items || []).map(s => ({ ...s, category: c.slug, catTitle: c.title }))
  );

export const getServiceBySlug = async (slug) =>
  getFlatServices().find(s => s.slug === slug) || null;

export const listServicesByCategory = (catSlug) =>
  (CATEGORIES.find(c => c.slug === catSlug)?.items || []);

export const highlightTop = (n = 6) =>
  getFlatServices().slice(0, n);
