import React from "react";
import ChatLitisBotUniversal from "@/oficinaVirtual/components/ChatLitisBotUniversal";

// Este componente solo recibe los props y los pasa al chat universal.
// Puedes llamarlo desde la ruta o layout con el modo/contexto deseado.

export default function LitisBotChatPRO({ usuarioId, modo, expedienteActual }) {
  return (
    <ChatLitisBotUniversal
      usuarioId={usuarioId}
      modo={modo} // "audiencia" o "oficina" (default)
      expedienteActual={expedienteActual}
    />
  );
}
