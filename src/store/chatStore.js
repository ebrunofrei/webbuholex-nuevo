// src/store/chatStore.js
import { create } from "zustand";

export const useChatStore = create((set) => ({
  casoActivoId: null,
  chats: {}, // { [casoId]: { mensajes: [...] } }
  agregarMensajeSistema: ({ casoId, tipo, contenido, original }) =>
    set((state) => {
      if (!casoId) return state;
      const chat = state.chats[casoId] || { mensajes: [] };
      return {
        ...state,
        chats: {
          ...state.chats,
          [casoId]: {
            ...chat,
            mensajes: [
              ...chat.mensajes,
              {
                id: Date.now(),
                tipo,
                contenido,
                original,
                autor: "sistema",
                fecha: new Date().toISOString(),
              },
            ],
          },
        },
      };
    }),
  // ...otros métodos y estado
}));
