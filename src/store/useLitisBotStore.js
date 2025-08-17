import { create } from "zustand";

// Puedes expandir el estado global según tus necesidades (user, idioma, área, historial, etc.)
const useLitisBotStore = create((set) => ({
  mensajes: [
    { from: "bot", text: "¡Hola! Soy LitisBot, tu asistente legal multilingüe. Puedes escribir, dictar o subir un archivo para analizar." }
  ],
  idioma: "es", // idioma global (puedes conectar con el selector visual)
  areaDerecho: "General",
  listening: false,

  // Métodos globales:
  setMensajes: (msgs) => set({ mensajes: msgs }),
  pushMensaje: (msg) => set((state) => ({ mensajes: [...state.mensajes, msg] })),
  clearMensajes: () =>
    set({
      mensajes: [
        { from: "bot", text: "¡Hola! Soy LitisBot, tu asistente legal multilingüe." }
      ]
    }),
  setIdioma: (idioma) => set({ idioma }),
  setAreaDerecho: (area) => set({ areaDerecho: area }),
  setListening: (estado) => set({ listening: estado }),
}));

export default useLitisBotStore;
