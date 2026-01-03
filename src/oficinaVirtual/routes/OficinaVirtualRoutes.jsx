// src/oficinaVirtual/routes/OficinaVirtualRoutes.jsx
import { Routes, Route } from "react-router-dom";

import PanelConfiguracionOficina from "../pages/configuracion/PanelConfiguracionOficina";
import PagoPRO from "../pages/pagos/PagoPRO";
import Noticias from "../pages/Noticias";

// Nuevo: página que envuelve a LitisBotChatPro
import LitisBotChatProPage from "../pages/escritorio/LitisBotChatProPage";

/**
 * Rutas internas de la Oficina Virtual.
 * Este router se monta normalmente bajo /oficinaVirtual/*
 */
export default function OficinaVirtualRoutes() {
  return (
    <Routes>
      {/* Home o dashboard de oficina (opcional, según lo tengas) */}
      {/* <Route path="/" element={<HomeOficina />} /> */}

      {/* Configuración de la oficina */}
      <Route path="/configuracion" element={<PanelConfiguracionOficina />} />

      {/* Pagos / upgrade a PRO */}
      <Route path="/pagos" element={<PagoPRO />} />

      {/* Noticias dentro de la oficina */}
      <Route path="/noticias" element={<Noticias />} />

      {/* 🧠 NUEVO: modo escritorio de LitisBot dentro de la Oficina Virtual */}
      <Route path="/litisbot" element={<LitisBotChatProPage />} />

      {/* ...otras rutas que ya tengas definidas */}
    </Routes>
  );
}
