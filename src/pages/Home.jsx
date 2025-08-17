import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import logoBuho from "../assets/buho-institucional.png";
import NoticiasSlidebar from "../components/NoticiasSlidebar";
import { Link } from "react-router-dom";
import { useNoticias } from "../context/NoticiasContext";
import { obtenerNoticias } from "../services/firebaseNoticiasService";
import PageContainer from "@/components/PageContainer";

export default function Home() {
  const { showNoticias, setShowNoticias } = useNoticias();
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Traer noticias públicas desde Firestore al cargar la página
  useEffect(() => {
    obtenerNoticias({ max: 10, soloLibres: true })
      .then(setNoticias)
      .finally(() => setLoading(false));
  }, []);

  const handleOficina = () => {
    if (window.location.pathname === "/oficina") return;
    window.location.href = "/oficina";
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white">
      {/* Fondos laterales difuminados */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-[140px] sm:w-[180px] bg-gradient-to-r from-[#b03a1a]/60 via-transparent to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[140px] sm:w-[180px] bg-gradient-to-l from-[#b03a1a]/60 via-transparent to-transparent" />
      </div>
      {/* HERO central */}
      <motion.div
        className="fixed inset-0 z-30 flex flex-col items-center justify-center w-full"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center pointer-events-auto px-4">
          <img
            src={logoBuho}
            alt="Logo BúhoLex"
            className="w-44 sm:w-60 max-w-xs rounded-2xl shadow-2xl bg-white/90 border-4 border-[#4b2e19] mb-6"
            draggable={false}
          />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#b03a1a] text-center mb-2 leading-tight drop-shadow">
            BúhoLex: justicia sin privilegios.
          </h2>
          <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-[#4b2e19] text-center mb-7 leading-snug">
            LitisBot <span className="font-black text-[#b03a1a]">¡¡te acompaña y te defiende!!</span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-2 w-full max-w-lg justify-center">
            <Link
              to="/litisbot"
              className="bg-[#4b2e19] text-white rounded-xl px-8 py-4 font-extrabold text-lg shadow hover:bg-[#a87247] transition w-full sm:w-auto block text-center focus:outline-none focus:ring-2 focus:ring-[#b03a1a] focus:ring-offset-2"
              style={{ pointerEvents: "auto" }}
            >
              Consultar con LitisBot
            </Link>
            <button
              onClick={handleOficina}
              className="bg-white text-[#b03a1a] border-2 border-[#b03a1a] rounded-xl px-8 py-4 font-extrabold text-lg shadow hover:bg-[#fff6f6] hover:text-[#980808] transition w-full sm:w-auto"
              style={{ pointerEvents: "auto" }}
              type="button"
            >
              Oficina Virtual Abogados
            </button>
          </div>
        </div>
      </motion.div>
      {/* Slidebar de Noticias */}
      <NoticiasSlidebar
        open={showNoticias}
        onClose={() => setShowNoticias(false)}
        noticias={loading ? [] : (noticias.length ? noticias : [
          { titulo: "LitisBot se integra a la web de BúhoLex", resumen: "Ahora puedes consultar con IA jurídica gratis." },
          { titulo: "Nueva oficina virtual para abogados", resumen: "Organiza tus expedientes online con BúhoLex." },
        ])}
      />
    </div>
  );
}
