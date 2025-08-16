import React from "react";
import { AudienciaProvider } from "./useAudienciaContext";
import ChatAudiencia from "./ChatAudiencia";

export default function LitisBotAudiencia() {
  return (
    <AudienciaProvider>
      <div className="min-h-screen flex flex-col items-center bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">LitisBot Audiencia – Asistente en Tiempo Real</h1>
        <ChatAudiencia />
      </div>
    </AudienciaProvider>
  );
}
