// src/constants/noticiasGeneralChips.js
// ============================================================
// 🦉 BúhoLex | Chips para Noticias GENERALES (sin cruces)
// - Cada chip define: q (multilingüe básico) + providers sugeridos
// - Si providers=[], el panel usará proveedores multimedia por defecto
// - No toques aquí lógica de carga; solo el mapa
// ============================================================

export const CHIP_MAP = {
  actualidad: {
    label: "actualidad",
    q: 'actualidad OR "última hora" OR breaking',
    providers: [], // feed amplio + multimedia
  },
  politica: {
    label: "política",
    q:
      '(política OR gobierno OR congreso OR decreto OR ley OR presidente) ' +
      'OR (politics OR government OR parliament OR congress OR president)',
    providers: ["elpais", "rpp", "bbc"], // generalistas serios
  },
  economia: {
    label: "economía",
    q:
      '(economía OR inflacion OR inflación OR dólar OR empleo OR mercado OR finanzas OR SUNAT OR PBI) ' +
      'OR (economy OR inflation OR dollar OR employment OR market OR finance OR GDP)',
    providers: ["rpp", "elpais", "reuters"],
  },
  corrupcion: {
    label: "corrupción",
    q:
      '(corrupción OR soborno OR coima OR "lavado de activos" OR colusión OR peculado) ' +
      'OR (corruption OR bribery OR "money laundering" OR embezzlement)',
    providers: ["elpais", "rpp", "reuters"],
  },
  ciencia: {
    label: "ciencia",
    q:
      '(ciencia OR investigación OR salud OR estudio OR descubrimiento OR universidad OR hospital) ' +
      'OR (science OR research OR study OR discovery OR health)',
    providers: ["bbc", "dw", "reuters", "ap"],
  },
  tecnologia: {
    label: "tecnología",
    q:
      '(tecnología OR IA OR "inteligencia artificial" OR ciberseguridad OR software OR datos OR móvil OR robot OR chip) ' +
      'OR (technology OR AI OR cybersecurity OR software OR data OR mobile OR robotics OR chip)',
    providers: ["bbc", "dw", "reuters"],
  },
  sociedad: {
    label: "sociedad",
    q:
      '(sociedad OR educación OR cultura OR familia OR comunidad OR social) ' +
      'OR (society OR social OR community OR culture OR education)',
    providers: ["elpais", "rpp"],
  },
  internacional: {
    label: "internacional",
    q: '(internacional OR mundo OR geopolitica) OR (world OR international OR global)',
    providers: ["reuters", "ap", "bbc", "dw", "euronews"],
  },
};

// (Opcional Perú) añade o quita según tu preferencia:
//  - "elcomercio", "rpp", "andina" (si lo integras en providers del backend)
