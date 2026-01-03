export const PE_RULESET = {
  id: "PE",
  name: "Perú – Base",
  domains: {
    civil: {
      id: "pe.civil",
      actos: {
        // Ejemplos (tú luego los ajustas a CPC/CPP según tu criterio real):
        // “traslado” típico: 3 días hábiles (solo ejemplo)
        traslado: { tipo: "habiles", cantidad: 3, ajusteInhabil: true },

        // “apelacion” (ejemplo)
        apelacion: { tipo: "habiles", cantidad: 10, ajusteInhabil: true },

        // “subsanacion” (ejemplo)
        subsanacion: { tipo: "habiles", cantidad: 2, ajusteInhabil: true },
      },
    },

    penal: {
      id: "pe.penal",
      actos: {
        // ejemplos
        apelacion: { tipo: "habiles", cantidad: 3, ajusteInhabil: true },
      },
    },
  },
};
