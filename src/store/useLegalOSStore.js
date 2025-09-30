import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cargarPerfilUsuario, guardarTodoUsuario } from "@/utils/firestoreSync";

// --- Datos por defecto ---
const defaultBotMsg = {
  from: "bot",
  text: "¡Hola! Soy LitisBot, tu asistente legal multilingüe. ¿En qué puedo ayudarte hoy?",
};

const MODULOS_DISPONIBLES = [
  { key: "chat", label: "Chat LitisBot", visible: true, pro: false, route: "/litisbot" },
  { key: "agenda", label: "Agenda", visible: true, pro: true, route: "/agenda" }, // PRO
  { key: "expedientes", label: "Expedientes", visible: true, pro: true, route: "/casilla-expedientes" }, // PRO
  { key: "notificaciones", label: "Notificaciones", visible: true, pro: false, route: "/notificaciones" },
];

const defaultBranding = {
  logoUrl: "",
  nombreEstudio: "Mi Estudio Legal",
  colorPrimary: "#b03a1a",
  casillas: [
    {
      nombre: "Casilla de Expedientes",
      icono: "📂",
      modulos: [MODULOS_DISPONIBLES[2]],
    },
    {
      nombre: "Agenda de Audiencias",
      icono: "📅",
      modulos: [MODULOS_DISPONIBLES[1]],
    },
    {
      nombre: "Notificaciones",
      icono: "🔔",
      modulos: [MODULOS_DISPONIBLES[3]],
    },
    {
      nombre: "Chat Legal",
      icono: "🤖",
      modulos: [MODULOS_DISPONIBLES[0]],
    },
  ],
};

// --- Slices ---
const createBrandingSlice = (set) => ({
  branding: defaultBranding,
  setBranding: (branding) => set({ branding }),
  updateBranding: (k, v) => set((state) => ({
    branding: { ...state.branding, [k]: v }
  })),
  setCasillas: (casillas) => set((state) => ({
    branding: { ...state.branding, casillas }
  })),
  // Hydrata branding desde Firestore para el usuario actual
  asyncHidratarBranding: async (uid) => {
    if (!uid) return;
    const perfil = await cargarPerfilUsuario(uid);
    if (perfil?.branding) {
      set({ branding: { ...defaultBranding, ...perfil.branding } });
    }
  },
});

const createChatSlice = (set) => ({
  mensajes: [defaultBotMsg],
  setMensajes: (msgs) => set({ mensajes: msgs }),
  pushMensaje: (msg) => set((state) => ({ mensajes: [...state.mensajes, msg] })),
  clearMensajes: () => set({ mensajes: [defaultBotMsg] }),
  idioma: "es",
  areaDerecho: "General",
  setIdioma: (idioma) => set({ idioma }),
  setAreaDerecho: (area) => set({ areaDerecho: area }),
});
const createNotiSlice = (set) => ({
  notificaciones: [],
  pushNoti: (noti) => set((state) => ({ notificaciones: [...state.notificaciones, noti] })),
  removeNoti: (id) => set((state) => ({
    notificaciones: state.notificaciones.filter((n) => n.id !== id),
  })),
  clearNotis: () => set({ notificaciones: [] }),
});
const createAgendaSlice = (set) => ({
  eventos: [],
  addEvento: (ev) => set((state) => ({ eventos: [...state.eventos, ev] })),
  removeEvento: (id) => set((state) => ({
    eventos: state.eventos.filter((e) => e.id !== id),
  })),
  updateEvento: (id, update) =>
    set((state) => ({
      eventos: state.eventos.map((e) =>
        e.id === id ? { ...e, ...update } : e
      ),
    })),
  clearAgenda: () => set({ eventos: [] }),
});
const createExpedienteSlice = (set) => ({
  expedientes: [],
  addExpediente: (exp) => set((state) => ({ expedientes: [...state.expedientes, exp] })),
  updateExpediente: (id, update) => set((state) => ({
    expedientes: state.expedientes.map((e) => (e.id === id ? { ...e, ...update } : e)),
  })),
  removeExpediente: (id) => set((state) => ({
    expedientes: state.expedientes.filter((e) => e.id !== id),
  })),
  clearExpedientes: () => set({ expedientes: [] }),
});

// --- SaaS y multiusuario ---
const createUsuarioSlice = (set, get) => ({
  usuarioId: null,
  setUsuarioId: (id) => set({ usuarioId: id }),
  plan: "free", // free | pro | enterprise
  fechaVencimiento: null,
  setPlan: (plan) => set({ plan }),
  setFechaVencimiento: (fecha) => set({ fechaVencimiento: fecha }),
  hidratarDesdeFirestore: (data) => {
    if (!data) return;
    Object.keys(data).forEach((k) => set({ [k]: data[k] }));
  },
  guardarEnFirestore: async () => {
    const { usuarioId, ...rest } = get();
    if (!usuarioId) return;
    await guardarTodoUsuario(usuarioId, rest);
  },
  resetStore: () =>
    set({
      usuarioId: null,
      ...createChatSlice(set),
      ...createNotiSlice(set),
      ...createAgendaSlice(set),
      ...createExpedienteSlice(set),
      ...createBrandingSlice(set),
      plan: "free",
      fechaVencimiento: null,
    }),
});

const useLegalOSStore = create(
  persist(
    (set, get) => ({
      ...createChatSlice(set, get),
      ...createNotiSlice(set, get),
      ...createAgendaSlice(set, get),
      ...createExpedienteSlice(set, get),
      ...createBrandingSlice(set, get),
      ...createUsuarioSlice(set, get),
    }),
    { name: "legalos-storage" }
  )
);

export default useLegalOSStore;
