// ============================================================================
// 🧠 LitisBotCognitiveContext (Enterprise – A2 Hardened + Persisted)
// ----------------------------------------------------------------------------
// Contexto cognitivo por sesión de chat.
// - NO renderiza UI
// - NO ejecuta lógica jurídica
// - Seguro para producción
// - Persistente y versionado
// ============================================================================

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

/* ========================================================================
   VERSIONADO Y STORAGE
======================================================================== */

const COG_STATE_VERSION = 1;
const STORAGE_KEY = `litisbot:cognitive:v${COG_STATE_VERSION}`;

/* ========================================================================
   ENUMS COGNITIVOS (CONTRATO ESTABLE)
======================================================================== */

// Modo principal (estratégico)
export const LITIS_MODE = Object.freeze({
  LITIGANTE: "litigante",
});

// Sub-roles cognitivos
export const LITIS_ROLES = Object.freeze({
  ABOGADO: "abogado",
  JUEZ: "juez",
  FISCAL: "fiscal",
  ACADEMICO: "academico",
  PERITO: "perito",
  AUDITOR: "auditor",
  CIENTIFICO: "cientifico",
  FILOSOFO: "filosofo",
  INVESTIGADOR: "investigador",
  CONSULTIVO: "consultivo",
  LOGICO: "logico",
});

// Labels solo para UI
export const LITIS_ROLE_LABELS = Object.freeze({
  abogado: "Abogado",
  juez: "Juez",
  fiscal: "Fiscal",
  academico: "Académico",
  perito: "Perito",
  auditor: "Auditor",
  cientifico: "Científico",
  filosofo: "Filósofo",
  investigador: "Investigador",
  consultivo: "Consultivo",
  logico: "Lógico-Jurídico",
});

/* ========================================================================
   PERFIL COGNITIVO BASE (ADN)
======================================================================== */

export const DEFAULT_COGNITIVE_PROFILE = Object.freeze({
  _profileVersion: 1,

  // Estilo
  tonoHumano: true,
  brevedad: false,
  profundidad: "alta", // baja | media | alta

  // Núcleo jurídico
  rigor: true,
  citasJuridicas: true,

  // Control lógico (prepara scoring / falacias)
  logicaJuridica: true,
  logicaFormal: true,
  logicaMatematica: true,
  controlDeFalacias: true,

  // Método científico-argumentativo
  metodo: {
    hipotesis: true,
    contrastacion: true,
    contraejemplos: true,
    cargaDeLaPrueba: true,
  },

  // Salida
  modoSalida: "markdown",

  // Seguridad epistémica
  marcarSupuestos: true,
  pedirDatosSiFaltaInfo: true,
});

/* ========================================================================
   HELPERS DE NORMALIZACIÓN
======================================================================== */

function normalizeProfile(input = {}) {
  const profundidad =
    ["baja", "media", "alta"].includes(input.profundidad)
      ? input.profundidad
      : DEFAULT_COGNITIVE_PROFILE.profundidad;

  return {
    ...DEFAULT_COGNITIVE_PROFILE,
    ...input,
    profundidad,
    metodo: {
      ...DEFAULT_COGNITIVE_PROFILE.metodo,
      ...(input.metodo || {}),
    },
  };
}

/* ========================================================================
   STORAGE (SILENCIOSO Y SEGURO)
======================================================================== */

function loadCognitiveState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.version !== COG_STATE_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveCognitiveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: COG_STATE_VERSION,
        ...state,
      })
    );
  } catch {
    /* nunca romper UI */
  }
}

/* ========================================================================
   CONTEXTO
======================================================================== */

const LitisBotCognitiveContext = createContext(null);

/* ========================================================================
   PROVIDER (A2 – HARDENED + PERSISTENTE)
======================================================================== */

export function LitisBotCognitiveProvider({
  children,
  initialRole = LITIS_ROLES.ABOGADO,
  initialProfile = {},
}) {
  // Modo fijo (estratégico)
  const modoLitis = LITIS_MODE.LITIGANTE;

  // Cargar estado persistido (si existe)
  const persisted = loadCognitiveState();

  // Rol cognitivo
  const [rolCognitivo, setRolCognitivo] = useState(
    persisted?.rolCognitivo || initialRole
  );

  // Perfil cognitivo
  const [cognitiveProfile, setCognitiveProfile] = useState(
    normalizeProfile(persisted?.cognitiveProfile || initialProfile)
  );

  // Persistencia automática
  useEffect(() => {
    saveCognitiveState({
      rolCognitivo,
      cognitiveProfile,
    });
  }, [rolCognitivo, cognitiveProfile]);

  const value = useMemo(() => {
    const updateProfile = (patch = {}) =>
      setCognitiveProfile((prev) =>
        normalizeProfile({
          ...prev,
          ...patch,
          metodo: {
            ...(prev.metodo || {}),
            ...(patch.metodo || {}),
          },
        })
      );

    return {
    // =====================
    // estado cognitivo
    // =====================
    modoLitis,
    rolCognitivo,
    cognitiveProfile,

    // =====================
    // setters controlados
    // =====================
    setRolCognitivo,
    setCognitiveProfile,
    updateProfile,
    resetProfile: () =>
      setCognitiveProfile({ ...DEFAULT_COGNITIVE_PROFILE }),

    // =====================
    // snapshot (PUENTE LIMPIO)
    // hardware → router → service
    // =====================
    getSnapshot: () => ({
      modoLitis,
      rolCognitivo,
      cognitiveProfile,
    }),

    // =====================
    // exports estáticos
    // =====================
    LITIS_MODE,
    LITIS_ROLES,
    LITIS_ROLE_LABELS,
    DEFAULT_COGNITIVE_PROFILE,
  };

  }, [rolCognitivo, cognitiveProfile]);

  return (
    <LitisBotCognitiveContext.Provider value={value}>
      {children}
    </LitisBotCognitiveContext.Provider>
  );
}

/* ========================================================================
   HOOKS
======================================================================== */

// Estricto (dev / interno)
export function useLitisCognitive() {
  const ctx = useContext(LitisBotCognitiveContext);
  if (!ctx) {
    throw new Error(
      "useLitisCognitive debe usarse dentro de LitisBotCognitiveProvider"
    );
  }
  return ctx;
}

// Seguro (producción)
export function useLitisCognitiveSafe() {
  try {
    return useContext(LitisBotCognitiveContext);
  } catch {
    return null;
  }
}
