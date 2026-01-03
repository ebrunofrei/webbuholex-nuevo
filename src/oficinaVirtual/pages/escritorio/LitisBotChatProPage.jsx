// src/oficinaVirtual/pages/escritorio/LitisBotChatProPage.jsx
/* ============================================================
   🧠 LitisBotChatProPage
   ------------------------------------------------------------
   - Envuelve el layout de escritorio de LitisBot dentro de
     Oficina Virtual.
   - En móvil redirige a /oficinaVirtual (se usa la burbuja).
   - Si VITE_FORCE_DESKTOP_CHAT_PRO=1, NO redirige y permite
     probar el layout de escritorio en móvil (modo diseño).
============================================================ */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LitisBotChatPro from "@/components/litisbot/LitisBotChatPro";
import { useAuth } from "@/context/AuthContext";
import LitisBotToolsModal from "@/components/litisbot/LitisBotToolsModal";
import { useMembership } from "@/hooks/useMembership";
import useIsMobile from "@/hooks/useIsMobile";
import useSyncJurisprudenciaSelection from "@/hooks/useSyncJurisprudenciaSelection";

// 👇 Flag de “modo diseño” controlado por .env
const FORCE_DESKTOP_CHAT_PRO =
  import.meta.env.VITE_FORCE_DESKTOP_CHAT_PRO === "1";

export default function LitisBotChatProPage() {
  const { user } = useAuth() || {};
  const { isPro } = useMembership(user || null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const pro = !!isPro;

  // 🔗 Enganche con la selección de jurisprudencia de la Oficina Virtual
  const {
    jurisSeleccionada,
    clearJurisSeleccionada: onClearJuris,
  } = useSyncJurisprudenciaSelection();

  // Estado del modal de herramientas IA
  const [showTools, setShowTools] = useState(false);
  const [toolKey, setToolKey] = useState(null);
  const [toolsError, setToolsError] = useState("");

  // 🔁 Comportamiento normal de producto:
  // en móvil, usar la Oficina + burbuja, NO el chat de escritorio.
  useEffect(() => {
    if (!FORCE_DESKTOP_CHAT_PRO && isMobile) {
      navigate("/oficinaVirtual", { replace: true });
    }
  }, [isMobile, navigate]);

  // Mientras redirige en móvil (modo producto), mostramos un mensaje simple
  if (!FORCE_DESKTOP_CHAT_PRO && isMobile) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-[#F7F7F7]">
        <div className="max-w-md text-center text-[#3A2A1A] px-6">
          <h1 className="text-lg font-semibold mb-2">
            LitisBot escritorio no está disponible en móvil
          </h1>
          <p className="text-sm text-[#6B6B76]">
            Usa la burbuja flotante de LitisBot en la Oficina Virtual para
            chatear desde tu teléfono.
          </p>
        </div>
      </div>
    );
  }

  // 💻 Escritorio (o modo diseño forzado): render normal del layout avanzado
  return (
    <>
      {/* Modal de herramientas IA (se mostrará cuando showTools sea true) */}
      {showTools && (
        <LitisBotToolsModal
          pro={pro}
          herramienta={toolKey}
          setHerramienta={setToolKey}
          error={toolsError}
          setError={setToolsError}
          onClose={() => {
            setShowTools(false);
            setToolKey(null);
            setToolsError("");
          }}
        />
      )}

      <div className="w-full h-full flex bg-[#F7F7F7]">
        <div className="flex-1 flex flex-col">
          <LitisBotChatPro
            user={user || null}
            pro={pro}
            // 🔗 Jurisprudencia seleccionada en la Oficina Virtual
            jurisSeleccionada={jurisSeleccionada}
            onClearJuris={onClearJuris}

            // Más adelante, si quieres, aquí puedes pasar callbacks
            // para que el Engine abra el modal de herramientas:
            // onOpenTools={(key) => { setToolKey(key); setShowTools(true); }}
          />
        </div>
      </div>
    </>
  );
}
