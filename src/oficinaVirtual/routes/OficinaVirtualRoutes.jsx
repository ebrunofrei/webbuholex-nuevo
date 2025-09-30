// src/oficinaVirtual/routes/OficinaVirtualRoutes.jsx

import { Routes, Route } from "react-router-dom";
import PanelConfiguracionOficina from "../pages/configuracion/PanelConfiguracionOficina";
import PagoPRO from "../pages/pagos/PagoPRO";
import Noticias from "../pages/Noticias";
// ...otros imports

export default function OficinaVirtualRoutes() {
  return (
    <Routes>
      <Route path="/configuracion" element={<PanelConfiguracionOficina />} />
      <Route path="/pagos" element={<PagoPRO />} />
      <Route path="/noticias" element={<Noticias />} />
      {/* ...otras rutas */}
    </Routes>
  );
}
