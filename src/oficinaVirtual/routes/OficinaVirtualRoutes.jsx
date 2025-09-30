// src/oficinaVirtual/routes/OficinaVirtualRoutes.jsx

import { Routes, Route } from "react-router-dom";
import PanelConfiguracionOficina from "@pages/../pages/configuracion/PanelConfiguracionOficina".replace("pages/", "");
import PagoPRO from "@pages/../pages/pagos/PagoPRO".replace("pages/", "");
import Noticias from "@pages/../pages/Noticias".replace("pages/", "");
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
