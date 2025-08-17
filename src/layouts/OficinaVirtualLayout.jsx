import React from "react";
import { useNoticias } from "../../context/NoticiasContext";
import { useLitisBotChat } from "../../context/LitisBotChatContext";
import { Megaphone } from "lucide-react";

export default function NoticiasBotonFlotante() {
  const { showNoticias, setShowNoticias } = useNoticias();
  const { showChat } = useLitisBotChat();

  if (showChat || showNoticias) return null;

  const handleOpenNoticias = () => {
    setShowNoticias(true);
  };

  return (
    <button
      onClick={handleOpenNoticias}
      style={{
        width: "auto",
        height: "auto",
        minWidth: "unset",
        minHeight: "unset",
        maxWidth: "none",
        maxHeight: "none",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
      className="
        flex items-center gap-2 px-5 py-3
        rounded-full shadow-2xl
        bg-[#b03a1a] text-white font-bold text-lg
        hover:bg-[#a87247] transition
        active:scale-95
        pointer-events-auto
      "
      aria-label="Abrir noticias"
    >
      <Megaphone size={22} className="text-white" />
      <span className="hidden sm:inline">Noticias</span>
    </button>
  );
}
